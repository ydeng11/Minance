import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseCsv, inferMapping } from "../src/csv.js";
import { inferImportDirectionDeterministic } from "../src/import-direction.js";

const FIXTURE_DIR = path.resolve("services/api/test/fixtures/testCsv");

function loadFixture(name) {
  const csvText = fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
  const parsed = parseCsv(csvText);
  const inferred = inferMapping(parsed, true);
  return { parsed, inferred };
}

test("deterministic direction inference handles major fixture conventions", () => {
  const amex = loadFixture("amex_credit.csv");
  const chase = loadFixture("chase_credit.csv");
  const minance = loadFixture("minance_credit_debit.csv");
  const cashApp = loadFixture("cash_app_debit.csv");
  const citi = loadFixture("citi_credit.csv");

  const amexDirection = inferImportDirectionDeterministic({
    parsedCsv: amex.parsed,
    mapping: amex.inferred.mapping,
    auxiliaryColumns: amex.inferred.auxiliary
  });
  const chaseDirection = inferImportDirectionDeterministic({
    parsedCsv: chase.parsed,
    mapping: chase.inferred.mapping,
    auxiliaryColumns: chase.inferred.auxiliary
  });
  const minanceDirection = inferImportDirectionDeterministic({
    parsedCsv: minance.parsed,
    mapping: minance.inferred.mapping,
    auxiliaryColumns: minance.inferred.auxiliary
  });
  const cashAppDirection = inferImportDirectionDeterministic({
    parsedCsv: cashApp.parsed,
    mapping: cashApp.inferred.mapping,
    auxiliaryColumns: cashApp.inferred.auxiliary
  });
  const citiDirection = inferImportDirectionDeterministic({
    parsedCsv: citi.parsed,
    mapping: citi.inferred.mapping,
    auxiliaryColumns: citi.inferred.auxiliary
  });

  assert.equal(amexDirection.signConvention, "positive_is_debit");
  assert.equal(chaseDirection.signConvention, "negative_is_debit");
  assert.equal(minanceDirection.signConvention, "positive_is_debit");
  assert.equal(cashAppDirection.signConvention, "negative_is_debit");
  assert.equal(citiDirection.amountMode, "split_debit_credit");
  assert.equal(citiDirection.signConvention, "split_columns");
});
