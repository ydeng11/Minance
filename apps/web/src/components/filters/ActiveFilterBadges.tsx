"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Badge information derived from active filter state.
 */
export interface ActiveBadge {
  key: string;
  label: string;
}

/**
 * Props for the ActiveFilterBadges component.
 */
export interface ActiveFilterBadgesProps {
  /** Filter state from Explorer or Transactions page */
  filters: Record<string, unknown>;
  /** Callback when individual filter badge is removed */
  onRemove: (key: string) => void;
  /** Optional callback to clear all filters */
  onClearAll?: () => void;
  /** Whether to show the "Clear all" button */
  showClearAll?: boolean;
}

/**
 * Derives active badges from filter state.
 * Returns badges for non-default/non-empty filter values.
 *
 * Badge labels follow these patterns:
 * - categories (array) -> "X categories" (count)
 * - accounts (array) -> "X accounts" (count)
 * - account (single) -> "Account: <value>"
 * - merchant -> "Merchant: <value>"
 * - tag -> "Tag: <value>"
 * - transactionTypes (array) -> "X types"
 * - direction -> "Direction: <value>"
 * - minAmount/maxAmount -> "Amount: <min>-<max>"
 * - range (if not default) -> "Range: <value>"
 * - recurring -> "Recurring"
 */
export function deriveActiveBadges(filters: Record<string, unknown>): ActiveBadge[] {
  const badges: ActiveBadge[] = [];

  // Merchant filter (Explorer only)
  const merchant = String(filters.merchant || "").trim();
  if (merchant) {
    badges.push({ key: "merchant", label: `Merchant: "${merchant}"` });
  }

  // Categories array
  const categories = Array.isArray(filters.categories) ? filters.categories as string[] : [];
  const invertCategories = Boolean(filters.invertCategories);
  if (categories.length > 0) {
    const prefix = invertCategories ? "Excluding" : "Filtering";
    badges.push({ key: "categories", label: `${prefix} ${categories.length} categories` });
  }

  // Accounts array (Transactions)
  const accounts = Array.isArray(filters.accounts) ? filters.accounts as string[] : [];
  if (accounts.length > 0) {
    badges.push({ key: "accounts", label: `${accounts.length} accounts` });
  }

  // Single account (Explorer)
  const account = String(filters.account || "").trim();
  if (account) {
    badges.push({ key: "account", label: `Account: ${account}` });
  }

  // Tag filter
  const tag = String(filters.tag || "").trim();
  if (tag) {
    badges.push({ key: "tag", label: `Tag: "${tag}"` });
  }

  // Transaction types array
  const transactionTypes = Array.isArray(filters.transactionTypes)
    ? filters.transactionTypes as string[]
    : [];
  if (transactionTypes.length > 0) {
    badges.push({ key: "transactionTypes", label: `${transactionTypes.length} types` });
  }

  // Direction filter (Explorer only, default is "all")
  const direction = String(filters.direction || "all");
  if (direction !== "all") {
    badges.push({ key: "direction", label: `Direction: ${direction}` });
  }

  // Category view filter
  const categoryView = String(filters.categoryView || "granular");
  if (categoryView !== "granular") {
    badges.push({
      key: "categoryView",
      label: `View: ${categoryView.charAt(0).toUpperCase() + categoryView.slice(1)}`
    });
  }

  // Amount range
  const minAmount = String(filters.minAmount || "").trim();
  const maxAmount = String(filters.maxAmount || "").trim();
  if (minAmount || maxAmount) {
    const minPart = minAmount || "0";
    const maxPart = maxAmount || "...";
    badges.push({ key: "amountRange", label: `Amount: ${minPart}-${maxPart}` });
  }

  // Range filter - check against page-specific default values
  // Detect page type: Explorer has "merchant" and single "account", Transactions has "accounts" array
  // Explorer default: "90d", Transactions default: "all"
  const range = String(filters.range || "");
  const hasMerchantField = "merchant" in filters;
  const hasAccountsArray = "accounts" in filters && Array.isArray(filters.accounts);

  // Determine default range based on page type
  const defaultRange = hasAccountsArray && !hasMerchantField ? "all" : "90d";

  if (range && range !== defaultRange) {
    badges.push({ key: "range", label: `Range: ${range}` });
  }

  // Comparison mode
  const compare = String(filters.compare || "none");
  if (compare === "previous") {
    badges.push({ key: "compare", label: "Compare: Previous Period" });
  }

  // Recurring filter
  const recurring = Boolean(filters.recurring);
  if (recurring) {
    badges.push({ key: "recurring", label: "Recurring" });
  }

  return badges;
}

/**
 * Displays removable badges for active filters.
 *
 * Each badge shows the filter label with an X button to remove it.
 * Optionally shows a "Clear all" button when showClearAll is true.
 *
 * Badge styling follows the accent pill pattern from MultiSelectField:
 * - rounded-full border
 * - semantic accent colors (border-accent/30, bg-accent-soft, text-accent)
 */
export function ActiveFilterBadges({
  filters,
  onRemove,
  onClearAll,
  showClearAll = false
}: ActiveFilterBadgesProps) {
  const activeBadges = useMemo(() => deriveActiveBadges(filters), [filters]);

  // Return null when no active filters
  if (activeBadges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeBadges.map((badge) => (
        <span
          key={badge.key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
            "border-accent/30 bg-accent-soft text-accent"
          )}
        >
          {badge.label}
          <button
            type="button"
            onClick={() => onRemove(badge.key)}
            aria-label={`Remove ${badge.key} filter`}
            className="transition-colors hover:text-text-primary"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {showClearAll && onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          aria-label="Clear all filters"
          className="text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
