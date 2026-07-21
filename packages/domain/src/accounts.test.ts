import test from "node:test";
import assert from "node:assert/strict";
import * as accountsModule from "./accounts";

test("getSupportedAccountTypes exposes the canonical account type list including depository", () => {
  const getSupportedAccountTypes = (accountsModule as {
    getSupportedAccountTypes?: () => string[];
  }).getSupportedAccountTypes;

  assert.equal(typeof getSupportedAccountTypes, "function");
  assert.deepEqual(getSupportedAccountTypes?.(), [
    "cash",
    "checking",
    "credit",
    "depository",
    "investment",
    "loan",
    "savings"
  ]);
});

test("computeNextRenewalDate returns null when both activation and last renewal are null", () => {
  assert.equal(accountsModule.computeNextRenewalDate(null, null, 12), null);
});

test("computeNextRenewalDate computes from activationDate when no lastRenewalDate", () => {
  const result = accountsModule.computeNextRenewalDate("2026-01-15", null, 12);
  assert.equal(result, "2027-01-15");
});

test("computeNextRenewalDate computes from lastRenewalDate when available", () => {
  const result = accountsModule.computeNextRenewalDate("2025-01-15", "2026-07-20", 12);
  assert.equal(result, "2027-07-20");
});

test("computeNextRenewalDate uses custom cycle months", () => {
  const result = accountsModule.computeNextRenewalDate("2026-01-15", null, 6);
  assert.equal(result, "2026-07-15");
});

test("computeNextRenewalDate returns null for invalid date input", () => {
  assert.equal(accountsModule.computeNextRenewalDate("not-a-date", null, 12), null);
  assert.equal(accountsModule.computeNextRenewalDate(null, "bad-date", 12), null);
});

test("computeNextRenewalDate returns null for non-positive cycle months", () => {
  assert.equal(accountsModule.computeNextRenewalDate("2026-01-15", null, 0), null);
  assert.equal(accountsModule.computeNextRenewalDate("2026-01-15", null, -1), null);
});

test("shouldRenewBenefits returns false when metadata has no activation or lastRenewalDate", () => {
  const metadata: accountsModule.CreditCardMetadata = {
    annualFee: null,
    activationDate: null,
    lastRenewalDate: null,
    renewalCycleMonths: 12,
    benefits: []
  };
  assert.equal(accountsModule.shouldRenewBenefits(metadata), false);
});

test("shouldRenewBenefits returns false when nextRenewalDate is in the future", () => {
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 5);
  const futureDate = farFuture.toISOString().slice(0, 10);

  const result = accountsModule.shouldRenewBenefits({
    annualFee: null,
    activationDate: futureDate,
    lastRenewalDate: null,
    renewalCycleMonths: 12,
    benefits: []
  });
  assert.equal(result, false);
});

test("shouldRenewBenefits returns true when nextRenewalDate is in the past", () => {
  const result = accountsModule.shouldRenewBenefits({
    annualFee: 95,
    activationDate: "2020-01-01",
    lastRenewalDate: null,
    renewalCycleMonths: 12,
    benefits: []
  });
  assert.equal(result, true);
});



test("resetBenefitsForRenewal resets consumable benefits and leaves permanent ones untouched", () => {
  const metadata: accountsModule.CreditCardMetadata = {
    annualFee: 95,
    activationDate: "2020-01-01",
    lastRenewalDate: "2026-01-01",
    renewalCycleMonths: 12,
    benefits: [
      {
        id: "b1",
        name: "$200 Credit",
        monetaryValue: 200,
        used: true,
        lastUsedDate: "2026-06-15",
        consumable: true
      },
      {
        id: "b2",
        name: "3x on dining",
        monetaryValue: null,
        used: false,
        lastUsedDate: null,
        consumable: false
      }
    ]
  };

  const renewed = accountsModule.resetBenefitsForRenewal(metadata);
  assert.equal(renewed.lastRenewalDate, "2026-01-01");
  // Consumable benefit is reset
  assert.equal(renewed.benefits[0].used, false);
  assert.equal(renewed.benefits[0].lastUsedDate, null);
  // Permanent benefit is left untouched
  assert.equal(renewed.benefits[1].used, false);
  assert.equal(renewed.benefits[1].lastUsedDate, null);
});

test("resetBenefitsForRenewal updates lastRenewalDate when explicit date provided", () => {
  const metadata: accountsModule.CreditCardMetadata = {
    annualFee: 95,
    activationDate: "2020-01-01",
    lastRenewalDate: "2025-01-01",
    renewalCycleMonths: 12,
    benefits: []
  };

  const renewed = accountsModule.resetBenefitsForRenewal(metadata, "2026-01-15");
  assert.equal(renewed.lastRenewalDate, "2026-01-15");
});

test("createDefaultClassMetadata returns null for non-credit account types", () => {
  const result = accountsModule.createDefaultClassMetadata("checking");
  assert.equal(result, null);
});

test("createDefaultClassMetadata returns credit metadata for credit type", () => {
  const result = accountsModule.createDefaultClassMetadata("credit");
  assert.ok(result);
  assert.equal(result?.type, "credit");
  assert.equal(result?.credit?.annualFee, null);
  assert.equal(result?.credit?.benefits.length, 0);
  assert.equal(result?.credit?.renewalCycleMonths, 12);
});

test("createDefaultClassMetadata ignores account type casing and whitespace", () => {
  const result = accountsModule.createDefaultClassMetadata("  CREDIT  ");
  assert.ok(result);
  assert.equal(result?.type, "credit");
});
