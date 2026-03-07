import test from "node:test";
import assert from "node:assert/strict";

import { isOfxQfxFile, parseOfxQfx } from "../src/ofx-qfx.ts";

test("isOfxQfxFile recognizes supported extensions", () => {
  assert.equal(isOfxQfxFile("statement.ofx"), true);
  assert.equal(isOfxQfxFile("statement.qfx"), true);
  assert.equal(isOfxQfxFile("statement.csv"), false);
});

test("parseOfxQfx maps OFX statement transactions to canonical rows", () => {
  const ofxText = [
    "<OFX>",
    "<CURDEF>USD",
    "<BANKACCTFROM>",
    "<ACCTID>ABC123",
    "<ACCTTYPE>CHECKING",
    "</BANKACCTFROM>",
    "<BANKTRANLIST>",
    "<STMTTRN>",
    "<TRNTYPE>DEBIT",
    "<DTPOSTED>20250101120000[-5:EST]",
    "<TRNAMT>-12.34",
    "<NAME>Coffee Shop",
    "<MEMO>Latte",
    "</STMTTRN>",
    "<STMTTRN>",
    "<TRNTYPE>CREDIT",
    "<DTPOSTED>20250102120000[-5:EST]",
    "<TRNAMT>1500.00",
    "<NAME>Payroll",
    "<MEMO>Deposit",
    "</STMTTRN>",
    "</BANKTRANLIST>",
    "</OFX>"
  ].join("\n");

  const parsed = parseOfxQfx(ofxText, { fileName: "statement.ofx" });
  assert.equal(parsed.rows.length, 2);
  assert.deepEqual(parsed.headers.slice(0, 5), ["date", "merchant", "description", "amount", "direction"]);
  assert.equal(parsed.rows[0].row.date, "2025-01-01");
  assert.equal(parsed.rows[0].row.amount, "-12.34");
  assert.equal(parsed.rows[0].row.direction, "outflow");
  assert.equal(parsed.rows[1].row.amount, "1500.00");
  assert.equal(parsed.rows[1].row.direction, "inflow");
});
