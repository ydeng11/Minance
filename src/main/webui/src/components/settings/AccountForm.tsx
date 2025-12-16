import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AccountFormValues = {
    bankName: string;
    accountName: string;
    accountType: string;
    initBalance: number;
};

type AccountFormMode = "create" | "edit";

type AccountFormErrors = Record<"bankName" | "accountName" | "accountType", string>;

const emptyErrors: AccountFormErrors = {
    bankName: "",
    accountName: "",
    accountType: "",
};

export interface AccountFormProps {
    mode: AccountFormMode;
    initialValues: AccountFormValues;
    supportedBanks: string[];
    supportedAccountTypes: string[];
    isSubmitting?: boolean;
    onSubmit: (values: AccountFormValues) => void;
    onCancel?: () => void;
}

export const AccountForm = ({
    mode,
    initialValues,
    supportedBanks,
    supportedAccountTypes,
    isSubmitting = false,
    onSubmit,
    onCancel,
}: AccountFormProps) => {
    const [values, setValues] = useState<AccountFormValues>(initialValues);
    const [errors, setErrors] = useState<AccountFormErrors>(emptyErrors);
    const [touched, setTouched] = useState<Record<keyof AccountFormErrors, boolean>>({
        bankName: false,
        accountName: false,
        accountType: false,
    });

    useEffect(() => {
        setValues(initialValues);
        setErrors(emptyErrors);
        setTouched({
            bankName: false,
            accountName: false,
            accountType: false,
        });
    }, [initialValues]);

    const isDirty = useMemo(() => {
        return (
            values.bankName !== initialValues.bankName ||
            values.accountName !== initialValues.accountName ||
            values.accountType !== initialValues.accountType ||
            values.initBalance !== initialValues.initBalance
        );
    }, [initialValues, values]);

    const updateValue = <K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]) => {
        setValues((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const markTouched = (key: keyof AccountFormErrors) => {
        setTouched((prev) => ({
            ...prev,
            [key]: true,
        }));
    };

    const validate = (): AccountFormErrors => {
        const nextErrors: AccountFormErrors = { ...emptyErrors };
        if (!values.bankName) {
            nextErrors.bankName = "Bank is required";
        }
        if (!values.accountName.trim()) {
            nextErrors.accountName = "Account name is required";
        }
        if (!values.accountType) {
            nextErrors.accountType = "Type is required";
        }
        return nextErrors;
    };

    const hasErrors = (validationErrors: AccountFormErrors) => {
        return Object.values(validationErrors).some(Boolean);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        setTouched({
            bankName: true,
            accountName: true,
            accountType: true,
        });

        if (hasErrors(validationErrors)) {
            return;
        }

        onSubmit({
            ...values,
            accountName: values.accountName.trim(),
        });
    };

    return (
        <form data-testid="account-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="account-bank">Bank</Label>
                <Select
                    value={values.bankName}
                    onValueChange={(value) => {
                        updateValue("bankName", value);
                        markTouched("bankName");
                    }}
                >
                    <SelectTrigger id="account-bank" data-testid="account-form-bank">
                        <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                        {supportedBanks.map((bank) => (
                            <SelectItem key={bank} value={bank}>
                                {bank}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {touched.bankName && errors.bankName && (
                    <p className="text-xs text-destructive">{errors.bankName}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                    id="account-name"
                    value={values.accountName}
                    onChange={(event) => updateValue("accountName", event.target.value)}
                    onBlur={() => markTouched("accountName")}
                    placeholder="e.g. Travel Card"
                />
                {touched.accountName && errors.accountName && (
                    <p className="text-xs text-destructive">{errors.accountName}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="account-type">Type</Label>
                <Select
                    value={values.accountType}
                    onValueChange={(value) => {
                        updateValue("accountType", value);
                        markTouched("accountType");
                    }}
                >
                    <SelectTrigger id="account-type" data-testid="account-form-type">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        {supportedAccountTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {touched.accountType && errors.accountType && (
                    <p className="text-xs text-destructive">{errors.accountType}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="account-balance">Starting Balance</Label>
                <Input
                    id="account-balance"
                    type="number"
                    step="0.01"
                    value={values.initBalance}
                    onChange={(event) => updateValue("initBalance", Number(event.target.value))}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    data-testid="account-form-submit"
                    disabled={isSubmitting || (mode === "edit" && !isDirty)}
                >
                    {mode === "edit" ? "Save changes" : "Save account"}
                </Button>
            </div>
        </form>
    );
};
