import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'

import { MultiSelect } from './multi-select'

// Keep cmdk-based Command real; mock Radix/visual-only wrappers for stability.
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    ...props
  }: React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) => (
    <span {...props}>{children}</span>
  ),
}))

vi.mock('@/components/ui/separator.tsx', () => ({
  Separator: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="separator" {...props} />
  ),
}))

vi.mock('lucide-react', () => ({
  Search: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
  CheckIcon: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
  ChevronDown: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
  WandSparkles: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
  XCircle: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
  XIcon: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
}))

vi.mock('@/components/ui/popover', async () => {
  const React = (await import('react')).default

  const Ctx = React.createContext<{ open: boolean }>({ open: false })

  const Popover = ({
    children,
    open,
  }: React.PropsWithChildren<{ open?: boolean }>) => (
    <Ctx.Provider value={{ open: !!open }}>{children}</Ctx.Provider>
  )

  const PopoverTrigger = ({ children }: React.PropsWithChildren) => <>{children}</>

  const PopoverContent = ({ children }: React.PropsWithChildren) => {
    const { open } = React.useContext(Ctx)
    if (!open) return null
    return <div data-testid="popover-content">{children}</div>
  }

  return { Popover, PopoverTrigger, PopoverContent }
})

describe('MultiSelect', () => {
  it('filters options by search input (e.g., Food -> Food & Drink)', () => {
    const onValueChange = vi.fn()

    render(
      <MultiSelect
        options={[
          { label: 'Dining', value: 'Dining' },
          // Regression: cmdk search should match on the item's `value` (not only visible label text).
          // This will fail unless we pass an explicit `value` prop to each CommandItem.
          { label: 'F&D', value: 'Food & Drink' },
          { label: 'Groceries', value: 'Groceries' },
        ]}
        onValueChange={onValueChange}
        defaultValue={[]}
        placeholder="Select categories"
      />,
    )

    // Open popover
    fireEvent.click(screen.getByRole('button', { name: /select categories/i }))

    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'Food' } })

    expect(screen.getByRole('option', { name: 'F&D' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Dining' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument()
  })

  it('filters options by search input (e.g., Din -> Dining)', () => {
    const onValueChange = vi.fn()

    render(
      <MultiSelect
        options={[
          { label: 'Dining', value: 'Dining' },
          { label: 'Food & Drink', value: 'Food & Drink' },
          { label: 'Groceries', value: 'Groceries' },
        ]}
        onValueChange={onValueChange}
        defaultValue={[]}
        placeholder="Select categories"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select categories/i }))

    const input = screen.getByPlaceholderText('Search...')
    // cmdk does fuzzy matching; use a strict-enough query that shouldn't match "Drink"
    fireEvent.change(input, { target: { value: 'Dining' } })

    expect(screen.getByRole('option', { name: 'Dining' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Food & Drink' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument()
  })
})
