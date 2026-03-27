import type { Category } from "@/lib/api/types";
import type { TransactionAccountOption, TransactionFormDraft, TransactionFormErrors } from "./form";

interface TransactionEditorFieldsProps {
  accountOptions: TransactionAccountOption[];
  categories: Category[];
  errors: TransactionFormErrors;
  form: TransactionFormDraft;
  idPrefix: string;
  onFieldChange: <K extends keyof TransactionFormDraft>(field: K, value: TransactionFormDraft[K]) => void;
}

const controlClassName =
  "rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500";

export function TransactionEditorFields({
  accountOptions,
  categories,
  errors,
  form,
  idPrefix,
  onFieldChange
}: TransactionEditorFieldsProps) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-transaction-date`}>
          Date
          <input
            id={`${idPrefix}-transaction-date`}
            type="date"
            name="transaction_date"
            value={form.transaction_date}
            onChange={(event) => onFieldChange("transaction_date", event.target.value)}
            className={controlClassName}
            required
          />
          {errors.transaction_date ? <span className="text-xs text-rose-300">{errors.transaction_date}</span> : null}
        </label>

        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-description`}>
          Description
          <input
            id={`${idPrefix}-description`}
            name="description"
            value={form.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            className={controlClassName}
            required
          />
          {errors.description ? <span className="text-xs text-rose-300">{errors.description}</span> : null}
        </label>

        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-merchant`}>
          Merchant
          <input
            id={`${idPrefix}-merchant`}
            name="merchant_raw"
            value={form.merchant_raw}
            onChange={(event) => onFieldChange("merchant_raw", event.target.value)}
            className={controlClassName}
          />
        </label>

        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-amount`}>
          Amount
          <input
            id={`${idPrefix}-amount`}
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(event) => onFieldChange("amount", event.target.value)}
            className={controlClassName}
            required
          />
          {errors.amount ? <span className="text-xs text-rose-300">{errors.amount}</span> : null}
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-direction`}>
          Direction
          <select
            id={`${idPrefix}-direction`}
            name="direction"
            value={form.direction}
            onChange={(event) => onFieldChange("direction", event.target.value as TransactionFormDraft["direction"])}
            className={controlClassName}
          >
            <option value="outflow">outflow</option>
            <option value="inflow">inflow</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-category`}>
          Category
          <select
            id={`${idPrefix}-category`}
            name="category_final"
            value={form.category_final}
            onChange={(event) => onFieldChange("category_final", event.target.value)}
            className={controlClassName}
          >
            <option value="">Select category</option>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.name}>
                {entry.emoji ? `${entry.emoji} ` : ""}{entry.name}
              </option>
            ))}
          </select>
          {errors.category_final ? <span className="text-xs text-rose-300">{errors.category_final}</span> : null}
        </label>

        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-account`}>
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

        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-type`}>
          Type
          <select
            id={`${idPrefix}-type`}
            name="transaction_type"
            value={form.transaction_type}
            onChange={(event) =>
              onFieldChange("transaction_type", event.target.value as TransactionFormDraft["transaction_type"])
            }
            className={controlClassName}
          >
            <option value="">Auto</option>
            <option value="expense">expense</option>
            <option value="income">income</option>
            <option value="transfer">transfer</option>
          </select>
          {errors.transaction_type ? <span className="text-xs text-rose-300">{errors.transaction_type}</span> : null}
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-neutral-300 md:col-span-2" htmlFor={`${idPrefix}-tags`}>
          Tags
          <input
            id={`${idPrefix}-tags`}
            name="tags"
            value={form.tags}
            onChange={(event) => onFieldChange("tags", event.target.value)}
            placeholder="monthly, rent"
            data-testid={`${idPrefix}-tags`}
            className={controlClassName}
          />
          {errors.tags ? <span className="text-xs text-rose-300">{errors.tags}</span> : null}
        </label>

        <label className="grid gap-1 text-sm text-neutral-300" htmlFor={`${idPrefix}-memo`}>
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
