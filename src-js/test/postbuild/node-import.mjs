/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

// NodeJS Built-Ins:
import { strict as assert } from "assert";

// Local Dependencies:
import { TextractDocument, TextractExpense } from "../..";
import testResponse from "../data/test-response.json" assert { type: "json" };
import testExpenseResponse from "../data/invoice-expense-response.json" assert { type: "json" };

console.log("Checking built assets can be used with NodeJS via 'import'...");

// Quick smoke tests:
const doc = new TextractDocument(testResponse);
assert.strictEqual(doc.nPages, 1);
assert.strictEqual(doc.pageNumber(1).nTables, 1);
doc.pageNumber(1).getLineClustersInReadingOrder();
doc.pageNumber(1).getLinesByLayoutArea();

const expense = new TextractExpense(testExpenseResponse);
assert.strictEqual(expense.nDocs, 1);
const expenseDoc = [...expense.iterDocs()][0];
assert.strictEqual(expenseDoc.nSummaryFields, 31);

console.log("Done!");
