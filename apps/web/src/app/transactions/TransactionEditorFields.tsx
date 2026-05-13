import type { Category } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { TransactionAccountOption, TransactionFormDraft, TransactionFormErrors } from "./form";

interface TransactionEditorFieldsProps {
  accountOptions: TransactionAccountOption[];
  categories: Category[];
  errors: TransactionFormErrors;
  form: TransactionFormDraft;
  idPrefix: string;
  onFieldBlur?: (field: keyof TransactionFormDraft) => void;
  onFieldChange: <K extends keyof TransactionFormDraft>(field: K, value: TransactionFormDraft[K]) => void;
}

const controlClassName =
  "rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-text-primary outline-none transition focus:border-accent";
const errorControlClassName = "border-danger focus:border-danger";
const labelClassName = "grid gap-1 text-sm text-text-secondary";
const errorTextClassName = "text-xs text-danger";

export function TransactionEditorFields({
  accountOptions,
  categories,
  errors,
  form,
  idPrefix,
  onFieldBlur,
  onFieldChange
}: TransactionEditorFieldsProps) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <label className={labelClassName} htmlFor={`${idPrefix}-transaction-date`}>
          Date
          <input
            id={`${idPrefix}-transaction-date`}
            type="date"
            name="transaction_date"
            value={form.transaction_date}
            onChange={(event) => onFieldChange("transaction_date", event.target.value)}
            onBlur={() => onFieldBlur?.("transaction_date")}
            aria-invalid={errors.transaction_date ? true : undefined}
            aria-describedby={errors.transaction_date ? `${idPrefix}-err-transaction_date` : undefined}
            className={cn(controlClassName, errors.transaction_date && errorControlClassName)}
            required
          />
          {errors.transaction_date ? (
            <span id={`${idPrefix}-err-transaction_date`} className={errorTextClassName}>
              {errors.transaction_date}
            </span>
          ) : null}
        </label>

        <label className={labelClassName} htmlFor={`${idPrefix}-description`}>
          Description
          <input
            id={`${idPrefix}-description`}
            name="description"
            value={form.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            onBlur={() => onFieldBlur?.("description")}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? `${idPrefix}-err-description` : undefined}
            className={cn(controlClassName, errors.description && errorControlClassName)}
            required
          />
          {errors.description ? (
            <span id={`${idPrefix}-err-description`} className={errorTextClassName}>
              {errors.description}
            </span>
          ) : null}
        </label>

        <label className={labelClassName} htmlFor={`${idPrefix}-merchant`}>
          Merchant
          <input
            id={`${idPrefix}-merchant`}
            name="merchant_raw"
            value={form.merchant_raw}
            onChange={(event) => onFieldChange("merchant_raw", event.target.value)}
            className={controlClassName}
          />
        </label>

        <label className={labelClassName} htmlFor={`${idPrefix}-amount`}>
          Amount
          <input
            id={`${idPrefix}-amount`}
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(event) => onFieldChange("amount", event.target.value)}
            onBlur={() => onFieldBlur?.("amount")}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? `${idPrefix}-err-amount` : undefined}
            className={cn(controlClassName, errors.amount && errorControlClassName)}
            required
          />
          {errors.amount ? (
            <span id={`${idPrefix}-err-amount`} className={errorTextClassName}>
              {errors.amount}
            </span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className={labelClassName} htmlFor={`${idPrefix}-direction`}>
          Direction
          <select
            id={`${idPrefix}-direction`}
            name="direction"
            value={form.direction}
            onChange={(event) => onFieldChange("direction", event.target.value as TransactionFormDraft["direction"])}
            onBlur={() => onFieldBlur?.("transaction_type")}
            className={controlClassName}
          >
            <option value="outflow">outflow</option>
            <option value="inflow">inflow</option>
          </select>
        </label>

        <label className={labelClassName} htmlFor={`${idPrefix}-category`}>
          Category
          <select
            id={`${idPrefix}-category`}
            name="category_final"
            value={form.category_final}
            onChange={(event) => onFieldChange("category_final", event.target.value)}
            onBlur={() => onFieldBlur?.("category_final")}
            aria-invalid={errors.category_final ? true : undefined}
            aria-describedby={errors.category_final ? `${idPrefix}-err-category_final` : undefined}
            className={cn(controlClassName, errors.category_final && errorControlClassName)}
          >
            <option value="">Select category</option>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.name}>
                {entry.emoji ? `${entry.emoji} ` : ""}{entry.name}
              </option>
            ))}
          </select>
          {errors.category_final ? (
            <span id={`${idPrefix}-err-category_final`} className={errorTextClassName}>
              {errors.category_final}
            </span>
          ) : null}
        </label>

        <label className={labelClassName} htmlFor={`${idPrefix}-account`}>
          Account
          <select
            id={`${idPrefix}-account`}
            name="account_name"
            value={form.account_name}
            onChange={(event) => onFieldChange("account_name", event.target.value)}
            className={controlClassName}
          >
            {accountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClassName} htmlFor={`${idPrefix}-type`}>
          Type
          <select
            id={`${idPrefix}-type`}
            name="transaction_type"
            value={form.transaction_type}
            onChange={(event) =>
              onFieldChange("transaction_type", event.target.value as TransactionFormDraft["transaction_type"])
            }
            onBlur={() => onFieldBlur?.("transaction_type")}
            aria-invalid={errors.transaction_type ? true : undefined}
            aria-describedby={errors.transaction_type ? `${idPrefix}-err-transaction_type` : undefined}
            className={cn(controlClassName, errors.transaction_type && errorControlClassName)}
          >
            <option value="">Auto</option>
            <option value="expense">expense</option>
            <option value="income">income</option>
            <option value="transfer">transfer</option>
          </select>
          {errors.transaction_type ? (
            <span id={`${idPrefix}-err-transaction_type`} className={errorTextClassName}>
              {errors.transaction_type}
            </span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className={cn(labelClassName, "md:col-span-2")} htmlFor={`${idPrefix}-tags`}>
          Tags
          <input
            id={`${idPrefix}-tags`}
            name="tags"
            value={form.tags}
            onChange={(event) => onFieldChange("tags", event.target.value)}
            onBlur={() => onFieldBlur?.("tags")}
            placeholder="monthly, rent"
            data-testid={`${idPrefix}-tags`}
            aria-invalid={errors.tags ? true : undefined}
            aria-describedby={errors.tags ? `${idPrefix}-err-tags` : undefined}
            className={cn(controlClassName, errors.tags && errorControlClassName)}
          />
          {errors.tags ? (
            <span id={`${idPrefix}-err-tags`} className={errorTextClassName}>
              {errors.tags}
            </span>
          ) : null}
        </label>

        <label className={labelClassName} htmlFor={`${idPrefix}-memo`}>
          Memo
          <input
            id={`${idPrefix}-memo`}
            name="memo"
            value={form.memo}
            onChange={(event) => onFieldChange("memo", event.target.value)}
            className={controlClassName}
          />
        </label>
      </div>
    </>
  );
}
