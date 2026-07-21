"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Undo2, X } from "lucide-react";
import type { AccountBenefit, CreditCardMetadata } from "@/lib/api/types";
import {
  computeNextRenewalDate,
  shouldRenewBenefits,
  resetBenefitsForRenewal,
  type AccountClassMetadata
} from "../../../../../packages/domain/src/accounts";

const FIELD_CLASS =
  "rounded-md border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const FIELD_ERROR_CLASS = "text-xs text-danger";
const FIELD_LABEL_CLASS = "text-sm font-medium text-text-primary";
const SECTION_HEADER_CLASS = "text-xs font-medium uppercase tracking-wide text-accent";
const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-border-strong px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent/40 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60";

// In-memory benefit name catalog (per-session, from user input)
let globalBenefitCatalog: string[] = [];

export function getBenefitCatalog(): string[] {
  return [...globalBenefitCatalog];
}

function addToBenefitCatalog(name: string) {
  const trimmed = name.trim();
  if (trimmed && !globalBenefitCatalog.includes(trimmed)) {
    globalBenefitCatalog = [...globalBenefitCatalog, trimmed].sort();
  }
}

interface CardDetailsSectionProps {
  classMetadata: AccountClassMetadata | null;
  onChange: (metadata: AccountClassMetadata | null) => void;
}

interface CreditCardEditorProps {
  metadata: CreditCardMetadata;
  onChange: (metadata: CreditCardMetadata) => void;
}

function BenefitRow({
  benefit,
  benefitCatalog,
  onChange,
  onRemove
}: {
  benefit: AccountBenefit;
  benefitCatalog: string[];
  onChange: (benefit: AccountBenefit) => void;
  onRemove: () => void;
}) {
  const [showCatalog, setShowCatalog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  // Close catalog on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catalogRef.current && !catalogRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowCatalog(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCatalog = benefitCatalog.filter(
    (name) => name.toLowerCase().includes(benefit.name.toLowerCase()) && name !== benefit.name
  );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-field p-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={benefit.name}
          onChange={(e) => {
            onChange({ ...benefit, name: e.target.value });
            setShowCatalog(true);
          }}
          onFocus={() => setShowCatalog(true)}
          placeholder="Benefit name"
          className={`${FIELD_CLASS} w-full`}
          ref={inputRef}
        />
        {showCatalog && filteredCatalog.length > 0 && (
          <div
            ref={catalogRef}
            className="absolute left-0 top-full z-10 mt-1 w-full max-h-36 overflow-y-auto rounded-md border border-border-subtle bg-surface-panel shadow-panel"
          >
            {filteredCatalog.map((name) => (
              <button
                key={name}
                type="button"
                className="w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-accent-soft hover:text-accent transition"
                onClick={() => {
                  onChange({ ...benefit, name });
                  setShowCatalog(false);
                  addToBenefitCatalog(name);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {benefit.consumable && (
        <>
          <div className="w-24 shrink-0">
            <input
              type="text"
              inputMode="decimal"
              value={benefit.monetaryValue ?? ""}
              onChange={(e) =>
                onChange({
                  ...benefit,
                  monetaryValue: e.target.value ? Number(e.target.value) : null
                })
              }
              placeholder="$ value"
              className={`${FIELD_CLASS} w-full`}
            />
          </div>
          <input
            type="checkbox"
            checked={benefit.used}
            onChange={(e) =>
              onChange({
                ...benefit,
                used: e.target.checked,
                lastUsedDate: e.target.checked
                  ? new Date().toISOString().slice(0, 10)
                  : null
              })
            }
            className="h-4 w-4 rounded border border-border-strong bg-surface-field text-accent focus-visible:ring-2 focus-visible:ring-focus-ring"
          />
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-text-muted hover:text-danger transition"
        aria-label="Remove benefit"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function CreditCardEditor({ metadata, onChange }: CreditCardEditorProps) {
  const [adding, setAdding] = useState(false);
  const [newBenefitName, setNewBenefitName] = useState("");
  const [newBenefitValue, setNewBenefitValue] = useState("");
  const [newBenefitConsumable, setNewBenefitConsumable] = useState(true);

  const nextRenewalDate = computeNextRenewalDate(
    metadata.activationDate,
    metadata.lastRenewalDate,
    metadata.renewalCycleMonths
  );

  const needsRenewal = shouldRenewBenefits(metadata);

  const benefitCatalog = getBenefitCatalog();

  const handleRenew = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    onChange(resetBenefitsForRenewal(metadata, today));
  }, [metadata, onChange]);

  const handleAddBenefit = useCallback(() => {
    const name = newBenefitName.trim();
    if (!name) return;

    addToBenefitCatalog(name);

    const newBenefit: AccountBenefit = {
      id: `bnft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      monetaryValue: newBenefitValue ? Number(newBenefitValue) : null,
      used: false,
      lastUsedDate: null,
      consumable: newBenefitConsumable
    };

    onChange({
      ...metadata,
      benefits: [...metadata.benefits, newBenefit]
    });

    setNewBenefitName("");
    setNewBenefitValue("");
    setNewBenefitConsumable(true);
    setAdding(false);
  }, [metadata, newBenefitName, newBenefitValue, newBenefitConsumable, onChange]);

  const handleUpdateBenefit = useCallback(
    (index: number, updated: AccountBenefit) => {
      const next = [...metadata.benefits];
      next[index] = updated;
      onChange({ ...metadata, benefits: next });
    },
    [metadata, onChange]
  );

  const handleRemoveBenefit = useCallback(
    (index: number) => {
      const next = metadata.benefits.filter((_, i) => i !== index);
      onChange({ ...metadata, benefits: next });
    },
    [metadata, onChange]
  );

  const updateField = useCallback(
    <K extends keyof CreditCardMetadata>(field: K, value: CreditCardMetadata[K]) => {
      onChange({ ...metadata, [field]: value });
    },
    [metadata, onChange]
  );

  // Filter catalog for add-new dropdown
  const hasAddInput = newBenefitName.length > 0;
  const filteredAddCatalog = hasAddInput
    ? benefitCatalog.filter((name) => name.toLowerCase().includes(newBenefitName.toLowerCase()))
    : [];
  const [showAddCatalog, setShowAddCatalog] = useState(false);

  return (
    <div className="space-y-4">
      {/* Annual fee & Renewal cycle */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={FIELD_LABEL_CLASS}>Annual fee ($)</label>
          <input
            type="text"
            inputMode="decimal"
            value={metadata.annualFee ?? ""}
            onChange={(e) =>
              updateField("annualFee", e.target.value ? Number(e.target.value) : null)
            }
            placeholder="No annual fee"
            className={FIELD_CLASS}
          />
        </div>
        <div className="grid gap-2">
          <label className={FIELD_LABEL_CLASS}>Renewal cycle (months)</label>
          <input
            type="number"
            min={1}
            value={metadata.renewalCycleMonths}
            onChange={(e) =>
              updateField("renewalCycleMonths", Math.max(1, Number(e.target.value) || 12))
            }
            className={FIELD_CLASS}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <label className={FIELD_LABEL_CLASS}>Activation date</label>
          <input
            type="date"
            value={metadata.activationDate ?? ""}
            onChange={(e) => updateField("activationDate", e.target.value || null)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="grid gap-2">
          <label className={FIELD_LABEL_CLASS}>Last renewal</label>
          <input
            type="date"
            value={metadata.lastRenewalDate ?? ""}
            onChange={(e) => updateField("lastRenewalDate", e.target.value || null)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="grid gap-2">
          <label className={FIELD_LABEL_CLASS}>Next renewal</label>
          <div className={`${FIELD_CLASS} flex items-center text-sm`}>
            {nextRenewalDate ? (
              <span className="text-text-primary">{nextRenewalDate}</span>
            ) : (
              <span className="text-text-muted">Set activation date</span>
            )}
          </div>
        </div>
      </div>

      {/* Renewal banner */}
      {needsRenewal && (
        <div className="rounded-lg border border-warning/35 bg-warning-soft px-3 py-2 text-sm text-warning">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Renewal due{nextRenewalDate ? ` (${nextRenewalDate})` : ""}. Benefits can be reset for the new cycle.
            </span>
            <button
              type="button"
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-md border border-warning/35 bg-warning-soft px-3 py-1.5 text-xs text-warning transition hover:border-warning/55"
              onClick={handleRenew}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              Renew benefits
            </button>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className={FIELD_LABEL_CLASS}>Benefits</p>
          {!adding && (
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => {
                setNewBenefitConsumable(true);
                setAdding(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add benefit
            </button>
          )}
        </div>

        {metadata.benefits.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed border-border-subtle bg-surface-field px-3 py-2 text-xs text-text-muted">
            No benefits tracked. Add one to start tracking card perks.
          </p>
        )}

        {/* Consumable benefits — tracked and reset on renewal */}
        {(() => {
          const consumableBenefits = metadata.benefits.filter((b) => b.consumable);
          if (consumableBenefits.length === 0) return null;
          return (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-text-muted">Consumable</p>
              {consumableBenefits.map((benefit) => {
                const realIndex = metadata.benefits.indexOf(benefit);
                return (
                  <BenefitRow
                    key={benefit.id}
                    benefit={benefit}
                    benefitCatalog={benefitCatalog}
                    onChange={(updated) => handleUpdateBenefit(realIndex, updated)}
                    onRemove={() => handleRemoveBenefit(realIndex)}
                  />
                );
              })}
            </div>
          );
        })()}

        {/* Non-consumable benefits — descriptive only */}
        {(() => {
          const staticBenefits = metadata.benefits.filter((b) => !b.consumable);
          if (staticBenefits.length === 0) return null;
          return (
            <div className="space-y-1.5">
              {staticBenefits.map((benefit) => {
                const realIndex = metadata.benefits.indexOf(benefit);
                return (
                  <BenefitRow
                    key={benefit.id}
                    benefit={benefit}
                    benefitCatalog={benefitCatalog}
                    onChange={(updated) => handleUpdateBenefit(realIndex, updated)}
                    onRemove={() => handleRemoveBenefit(realIndex)}
                  />
                );
              })}
            </div>
          );
        })()}

        {adding && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-field p-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newBenefitName}
                onChange={(e) => {
                  setNewBenefitName(e.target.value);
                  setShowAddCatalog(true);
                }}
                onFocus={() => setShowAddCatalog(true)}
                placeholder="Benefit name (e.g. $200 airline credit)"
                className={`${FIELD_CLASS} w-full`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddBenefit();
                  }
                }}
              />
              {showAddCatalog && filteredAddCatalog.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full max-h-36 overflow-y-auto rounded-md border border-border-subtle bg-surface-panel shadow-panel">
                  {filteredAddCatalog.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-accent-soft hover:text-accent transition"
                      onClick={() => {
                        setNewBenefitName(name);
                        setShowAddCatalog(false);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-24 shrink-0">
              <input
                type="text"
                inputMode="decimal"
                value={newBenefitValue}
                onChange={(e) => setNewBenefitValue(e.target.value)}
                placeholder="$"
                className={`${FIELD_CLASS} w-full`}
              />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={newBenefitConsumable}
                onChange={(e) => setNewBenefitConsumable(e.target.checked)}
                className="h-4 w-4 rounded border border-border-strong bg-surface-field text-accent focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              <span className="text-xs text-text-secondary select-none">Consumable</span>
            </label>
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              onClick={handleAddBenefit}
              disabled={!newBenefitName.trim()}
            >
              Add
            </button>
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => {
                setAdding(false);
                setNewBenefitName("");
                setNewBenefitValue("");
                setNewBenefitConsumable(true);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CardDetailsSection({ classMetadata, onChange }: CardDetailsSectionProps) {
  if (!classMetadata || classMetadata.type !== "credit") {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className={SECTION_HEADER_CLASS}>Card details</p>
      <CreditCardEditor
        metadata={classMetadata.credit}
        onChange={(credit) => onChange({ type: "credit", credit })}
      />
    </div>
  );
}
