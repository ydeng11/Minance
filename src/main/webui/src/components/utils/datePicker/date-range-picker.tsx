'use client'

import { type FC, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'
import { DateInput } from './date-input'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Switch } from './switch'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'
import { DEFAULT_END_DATE, DEFAULT_START_DATE, useDateRangeStore } from '@/store/dateRangeStore'
import { useDateRangeQuery } from "@/services/queries/useDateRangeQuery";

export interface DateRangePickerProps {
    /** Click handler for applying the updates from DateRangePicker. */
    onUpdate?: (values: { range: DateRange, rangeCompare?: DateRange }) => void
    /** Initial value for start date */
    initialDateFrom?: Date | string
    /** Initial value for end date */
    initialDateTo?: Date | string
    /** Initial value for start date for compare */
    initialCompareFrom?: Date | string
    /** Initial value for end date for compare */
    initialCompareTo?: Date | string
    /** Alignment of popover */
    align?: 'start' | 'center' | 'end'
    /** Option for locale */
    locale?: string
    /** Option for showing compare feature */
    showCompare?: boolean
}

const formatDate = (date: Date, locale: string = 'en-us'): string => {
    return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
    if (typeof dateInput === 'string') {
        // Split the date string to get year, month, and day parts
        const parts = dateInput.split('-').map((part) => parseInt(part, 10))
        // Create a new Date object using the local timezone
        // Note: Month is 0-indexed, so subtract 1 from the month part
        const date = new Date(parts[0], parts[1] - 1, parts[2])
        return date
    } else {
        // If dateInput is already a Date object, return it directly
        return dateInput
    }
}

interface DateRange {
    from: Date
    to: Date | undefined
}

interface Preset {
    name: string
    label: string
}

// Define presets
const PRESETS: Preset[] = [
    { name: 'thisMonth', label: 'This Month' },
    { name: 'last3Months', label: 'Last 3 Months' },
    { name: 'last6Months', label: 'Last 6 Months' },
    { name: 'lastYear', label: 'Last Year' },
    { name: 'lastCalendarYear', label: 'Last Calendar Year' }
]

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> & {
    filePath: string
} = ({
    initialDateFrom = getDateAdjustedForTimezone(DEFAULT_START_DATE),
    initialDateTo = getDateAdjustedForTimezone(DEFAULT_END_DATE),
    initialCompareFrom,
    initialCompareTo,
    onUpdate,
    align = 'end',
    locale = 'en-US',
    showCompare = true
}): JSX.Element => {
        const [isOpen, setIsOpen] = useState(false)

        const [range, setRange] = useState<DateRange>({
            from: getDateAdjustedForTimezone(initialDateFrom),
            to: initialDateTo
                ? getDateAdjustedForTimezone(initialDateTo)
                : getDateAdjustedForTimezone(initialDateFrom)
        })
        const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
            initialCompareFrom
                ? {
                    from: new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
                    to: initialCompareTo
                        ? new Date(new Date(initialCompareTo).setHours(0, 0, 0, 0))
                        : new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0))
                }
                : undefined
        )

        // Refs to store the values of range and rangeCompare when the date picker is opened
        const openedRangeRef = useRef<DateRange | undefined>()
        const openedRangeCompareRef = useRef<DateRange | undefined>()

        const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)

        const [isSmallScreen, setIsSmallScreen] = useState(
            typeof window !== 'undefined' ? window.innerWidth < 960 : false
        )

        const { refetch } = useDateRangeQuery();
        const { setDateRange } = useDateRangeStore();

        useEffect(() => {
            const handleResize = (): void => {
                setIsSmallScreen(window.innerWidth < 960)
            }

            window.addEventListener('resize', handleResize)

            // Clean up event listener on unmount
            return () => {
                window.removeEventListener('resize', handleResize)
            }
        }, [])

        const getPresetRange = (presetName: string): DateRange => {
            const preset = PRESETS.find(({ name }) => name === presetName)
            if (!preset) throw new Error(`Unknown date range preset: ${presetName}`)
            const from = new Date()
            const to = new Date()

            switch (preset.name) {
                case 'thisMonth':
                    from.setDate(1)
                    from.setHours(0, 0, 0, 0)
                    to.setHours(23, 59, 59, 999)
                    break
                case 'last3Months':
                    // Start from 3 months ago, 1st day of month
                    from.setMonth(from.getMonth() - 2)
                    from.setDate(1)
                    from.setHours(0, 0, 0, 0)
                    to.setHours(23, 59, 59, 999)
                    break
                case 'last6Months':
                    // Start from 6 months ago, 1st day of month
                    from.setMonth(from.getMonth() - 5)
                    from.setDate(1)
                    from.setHours(0, 0, 0, 0)
                    to.setHours(23, 59, 59, 999)
                    break
                case 'lastYear':
                    // Start from 1 year ago, same day
                    from.setFullYear(from.getFullYear() - 1)
                    from.setHours(0, 0, 0, 0)
                    to.setHours(23, 59, 59, 999)
                    break
                case 'lastCalendarYear':
                    // From January 1st to December 31st of last year
                    from.setFullYear(from.getFullYear() - 1)
                    from.setMonth(0) // January
                    from.setDate(1)
                    from.setHours(0, 0, 0, 0)

                    to.setFullYear(to.getFullYear() - 1)
                    to.setMonth(11) // December
                    to.setDate(31)
                    to.setHours(23, 59, 59, 999)
                    break
            }

            return { from, to }
        }

        const setPreset = (preset: string): void => {
            const range = getPresetRange(preset)
            setRange(range)
            if (rangeCompare) {
                const rangeCompare = {
                    from: new Date(
                        range.from.getFullYear() - 1,
                        range.from.getMonth(),
                        range.from.getDate()
                    ),
                    to: range.to
                        ? new Date(
                            range.to.getFullYear() - 1,
                            range.to.getMonth(),
                            range.to.getDate()
                        )
                        : undefined
                }
                setRangeCompare(rangeCompare)
            }
        }

        const checkPreset = useCallback((): void => {
            for (const preset of PRESETS) {
                const presetRange = getPresetRange(preset.name)

                const normalizedRangeFrom = new Date(range.from);
                normalizedRangeFrom.setHours(0, 0, 0, 0);
                const normalizedPresetFrom = new Date(
                    presetRange.from.setHours(0, 0, 0, 0)
                )

                const normalizedRangeTo = new Date(range.to ?? 0);
                normalizedRangeTo.setHours(0, 0, 0, 0);
                const normalizedPresetTo = new Date(
                    presetRange.to?.setHours(0, 0, 0, 0) ?? 0
                )

                if (
                    normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
                    normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
                ) {
                    setSelectedPreset(preset.name)
                    return
                }
            }

            setSelectedPreset(undefined)
        }, [range])

        const resetValues = (): void => {
            setRange({
                from:
                    typeof initialDateFrom === 'string'
                        ? getDateAdjustedForTimezone(initialDateFrom)
                        : initialDateFrom,
                to: initialDateTo
                    ? typeof initialDateTo === 'string'
                        ? getDateAdjustedForTimezone(initialDateTo)
                        : initialDateTo
                    : typeof initialDateFrom === 'string'
                        ? getDateAdjustedForTimezone(initialDateFrom)
                        : initialDateFrom
            })
            setRangeCompare(
                initialCompareFrom
                    ? {
                        from:
                            typeof initialCompareFrom === 'string'
                                ? getDateAdjustedForTimezone(initialCompareFrom)
                                : initialCompareFrom,
                        to: initialCompareTo
                            ? typeof initialCompareTo === 'string'
                                ? getDateAdjustedForTimezone(initialCompareTo)
                                : initialCompareTo
                            : typeof initialCompareFrom === 'string'
                                ? getDateAdjustedForTimezone(initialCompareFrom)
                                : initialCompareFrom
                    }
                    : undefined
            )
        }

        useEffect(() => {
            checkPreset()
        }, [range, checkPreset])

        const PresetButton = ({
            preset,
            label,
            isSelected
        }: {
            preset: string
            label: string
            isSelected: boolean
        }): JSX.Element => (
            <Button
                className={cn(isSelected && 'pointer-events-none')}
                variant="ghost"
                onClick={() => {
                    setPreset(preset)
                }}
            >
                <>
                    <span className={cn('pr-2 opacity-0', isSelected && 'opacity-70')}>
                        <CheckIcon width={18} height={18} />
                    </span>
                    {label}
                </>
            </Button>
        )

        // Helper function to check if two date ranges are equal
        const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
            if (!a || !b) return false;
            const fromEqual = a.from.getTime() === b.from.getTime();
            const toEqual = (!a.to && !b.to) || (a.to?.getTime() === b.to?.getTime());
            return fromEqual && toEqual;
        }

        useEffect(() => {
            // Only update refs when the picker is first opened
            if (isOpen && !openedRangeRef.current) {
                openedRangeRef.current = range;
                openedRangeCompareRef.current = rangeCompare;
            }
        }, [isOpen, range, rangeCompare]);

        const handleUpdate = () => {
            setIsOpen(false);

            // Check if ranges have changed
            const rangeChanged = !areRangesEqual(range, openedRangeRef.current);
            const compareRangeChanged = !areRangesEqual(rangeCompare, openedRangeCompareRef.current);

            if (rangeChanged || compareRangeChanged) {
                const fromDate = range.from.toISOString().split('T')[0];
                const toDate = range.to?.toISOString().split('T')[0] || '';
                setDateRange(fromDate, toDate);
                refetch();
                onUpdate?.({ range, rangeCompare });
            }
        };

        const updateButton = (
            <Button
                onClick={() => {
                    handleUpdate();
                }}
                className={cn(
                    'w-[120px] ml-2',
                    !isSmallScreen && 'w-[140px]'
                )}
            >
                Update
            </Button>
        );

        return (
            <Popover
                modal={true}
                open={isOpen}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        resetValues()
                    }
                    setIsOpen(open)
                }}
            >
                <PopoverTrigger asChild>
                    <Button size={'lg'} variant="ghost">
                        <div className="text-right">
                            <div className="py-1">
                                <div>{`${formatDate(range.from, locale)}${range.to != null ? ' - ' + formatDate(range.to, locale) : ''
                                    }`}</div>
                            </div>
                            {rangeCompare != null && (
                                <div className="opacity-60 text-xs -mt-1">
                                    <>
                                        vs. {formatDate(rangeCompare.from, locale)}
                                        {rangeCompare.to != null
                                            ? ` - ${formatDate(rangeCompare.to, locale)}`
                                            : ''}
                                    </>
                                </div>
                            )}
                        </div>
                        <div className="pl-1 opacity-60 -mr-2 scale-125">
                            {isOpen ? (<ChevronUpIcon width={24} />) : (<ChevronDownIcon width={24} />)}
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent align={align} className="w-auto">
                    <div className="flex py-2">
                        <div className="flex">
                            <div className="flex flex-col">
                                <div
                                    className="flex flex-col lg:flex-row gap-2 px-3 justify-end items-center lg:items-start pb-4 lg:pb-0">
                                    {showCompare && (
                                        <div className="flex items-center space-x-2 pr-4 py-1">
                                            <Switch
                                                defaultChecked={Boolean(rangeCompare)}
                                                onCheckedChange={(checked: boolean) => {
                                                    if (checked) {
                                                        if (!range.to) {
                                                            setRange({
                                                                from: range.from,
                                                                to: range.from
                                                            })
                                                        }
                                                        setRangeCompare({
                                                            from: new Date(
                                                                range.from.getFullYear(),
                                                                range.from.getMonth(),
                                                                range.from.getDate() - 365
                                                            ),
                                                            to: range.to
                                                                ? new Date(
                                                                    range.to.getFullYear() - 1,
                                                                    range.to.getMonth(),
                                                                    range.to.getDate()
                                                                )
                                                                : new Date(
                                                                    range.from.getFullYear() - 1,
                                                                    range.from.getMonth(),
                                                                    range.from.getDate()
                                                                )
                                                        })
                                                    } else {
                                                        setRangeCompare(undefined)
                                                    }
                                                }}
                                                id="compare-mode"
                                            />
                                            <Label htmlFor="compare-mode">Compare</Label>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <DateInput
                                                value={range.from}
                                                onChange={(date) => {
                                                    const toDate =
                                                        range.to == null || date > range.to ? date : range.to
                                                    setRange((prevRange) => ({
                                                        ...prevRange,
                                                        from: date,
                                                        to: toDate
                                                    }))
                                                }}
                                            />
                                            <div className="py-1">-</div>
                                            <DateInput
                                                value={range.to}
                                                onChange={(date) => {
                                                    const fromDate = date < range.from ? date : range.from
                                                    setRange((prevRange) => ({
                                                        ...prevRange,
                                                        from: fromDate,
                                                        to: date
                                                    }))
                                                }}
                                            />
                                        </div>
                                        {rangeCompare != null && (
                                            <div className="flex gap-2">
                                                <DateInput
                                                    value={rangeCompare?.from}
                                                    onChange={(date) => {
                                                        if (rangeCompare) {
                                                            const compareToDate =
                                                                rangeCompare.to == null || date > rangeCompare.to
                                                                    ? date
                                                                    : rangeCompare.to
                                                            setRangeCompare((prevRangeCompare) => ({
                                                                ...prevRangeCompare,
                                                                from: date,
                                                                to: compareToDate
                                                            }))
                                                        } else {
                                                            setRangeCompare({
                                                                from: date,
                                                                to: new Date()
                                                            })
                                                        }
                                                    }}
                                                />
                                                <div className="py-1">-</div>
                                                <DateInput
                                                    value={rangeCompare?.to}
                                                    onChange={(date) => {
                                                        if (rangeCompare && rangeCompare.from) {
                                                            const compareFromDate =
                                                                date < rangeCompare.from
                                                                    ? date
                                                                    : rangeCompare.from
                                                            setRangeCompare({
                                                                ...rangeCompare,
                                                                from: compareFromDate,
                                                                to: date
                                                            })
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isSmallScreen && (
                                    <Select defaultValue={selectedPreset} onValueChange={(value) => {
                                        setPreset(value)
                                    }}>
                                        <SelectTrigger className="w-[180px] mx-auto mb-2">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRESETS.map((preset) => (
                                                <SelectItem key={preset.name} value={preset.name}>
                                                    {preset.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <div className="flex gap-4">
                                    <div>
                                        <Calendar
                                            mode="single"
                                            selected={range.from}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setRange((prev) => ({
                                                        ...prev,
                                                        from: date,
                                                        // If end date is before start date, update it
                                                        to: prev.to && date > prev.to ? date : prev.to
                                                    }));
                                                }
                                            }}
                                            defaultMonth={range.from}
                                            numberOfMonths={1}
                                        />
                                    </div>
                                    <div>
                                        <Calendar
                                            mode="single"
                                            selected={range.to}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setRange((prev) => ({
                                                        ...prev,
                                                        to: date,
                                                        // If start date is after end date, update it
                                                        from: date < prev.from ? date : prev.from
                                                    }));
                                                }
                                            }}
                                            defaultMonth={range.to || range.from}
                                            numberOfMonths={1}
                                            disabled={(date) => date < range.from}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {!isSmallScreen && (
                            <div className="flex flex-col items-end gap-1 pr-2 pl-6 pb-6">
                                <div className="flex w-full flex-col items-end gap-1 pr-2 pl-6 pb-6">
                                    {PRESETS.map((preset) => (
                                        <PresetButton
                                            key={preset.name}
                                            preset={preset.name}
                                            label={preset.label}
                                            isSelected={selectedPreset === preset.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 py-2 pr-4">
                        <Button
                            onClick={() => {
                                setIsOpen(false)
                                resetValues()
                            }}
                            variant="ghost"
                        >
                            Cancel
                        </Button>
                        {updateButton}
                    </div>
                </PopoverContent>
            </Popover>
        )
    }

DateRangePicker.displayName = 'DateRangePicker'
DateRangePicker.filePath =
    'libs/shared/ui-kit/src/lib/date-range-picker/date-range-picker.tsx'
