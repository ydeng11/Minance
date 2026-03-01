import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { detectDelimiter, parseCsv, inferMapping } from "../src/csv.js";

const FIXTURE_DIR = path.resolve("services/api/test/fixtures/testCsv");

test("detectDelimiter chooses common delimiter", () => {
  assert.equal(detectDelimiter("date,merchant,amount"), ",");
  assert.equal(detectDelimiter("date;merchant;amount"), ";");
});

test("parseCsv parses rows and headers", () => {
  const parsed = parseCsv("Date,Merchant,Amount\n2026-01-01,Coffee Shop,-5.20\n2026-01-02,Payroll,1200.00");
  assert.equal(parsed.headers.length, 3);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].row.Merchant, "Coffee Shop");
});

test("parseCsv supports multiline quoted rows (amex style)", () => {
  const csvText = [
    "Date,Description,Amount,Address,City/State,Zip Code,Country,Reference,Category",
    '07/23/2023,SUNRISE MANAGEMENT ISUNRISE             FL,52.52,10065 SUNSET STRIP,"SUNRISE',
    '33322",FL,UNITED STATES,3256750613472558,Merchandise & Supplies-Groceries',
    '07/09/2023,TRADER JOE S #775 00PEMBROKE PINE       FL,60.20,11960 PNES BLVD,"HOLLYWOOD',
    '33026",FL,UNITED STATES,32056756910267101407,Merchandise & Supplies-Groceries'
  ].join("\n");

  const parsed = parseCsv(csvText);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].row["City/State"], "SUNRISE\n33322");
  assert.equal(parsed.rows[0].row.Amount, "52.52");
  assert.equal(parsed.rows[1].row["City/State"], "HOLLYWOOD\n33026");
});

test("inferMapping resolves required fields", () => {
  const parsed = parseCsv("posted_date,payee,transaction_amount,currency_code\n2026-01-01,Coffee Shop,-5.20,USD");
  const inferred = inferMapping(parsed, true);

  assert.equal(inferred.mapping.date, "posted_date");
  assert.equal(inferred.mapping.merchant, "payee");
  assert.equal(inferred.mapping.amount, "transaction_amount");
  assert.ok(inferred.confidenceByField.date > 0.6);
  assert.ok(inferred.confidenceByField.merchant > 0.6);
  assert.ok(inferred.confidenceByField.amount > 0.6);
});

test("inferMapping avoids account/member columns for merchant", () => {
  const boaText = fs.readFileSync(path.join(FIXTURE_DIR, "boa.csv"), "utf8");
  const citiText = fs.readFileSync(path.join(FIXTURE_DIR, "citi_credit.csv"), "utf8");

  const boaParsed = parseCsv(boaText);
  const citiParsed = parseCsv(citiText);

  const boaInferred = inferMapping(boaParsed, true);
  const citiInferred = inferMapping(citiParsed, true);

  assert.notEqual(boaInferred.mapping.merchant, "Account Name");
  assert.notEqual(citiInferred.mapping.merchant, "Member Name");
  assert.ok(Boolean(boaInferred.mapping.merchant));
  assert.ok(Boolean(citiInferred.mapping.merchant));
});

test("inferMapping surfaces auxiliary debit/credit/type/status columns", () => {
  const parsed = parseCsv("Date,Description,Debit,Credit,Status,Type\n2026-01-01,Store,20,,Cleared,Sale\n2026-01-02,Autopay,,200,Cleared,Payment");
  const inferred = inferMapping(parsed, true);

  assert.equal(inferred.auxiliary.debit, "Debit");
  assert.equal(inferred.auxiliary.credit, "Credit");
  assert.equal(inferred.auxiliary.status, "Status");
  assert.equal(inferred.auxiliary.type, "Type");
});
