/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

// NodeJS Built-Ins:
const assert = require("assert").strict;

// Local Dependencies:
const { TextractDocument, TextractExpense } = require("../../dist/umd");
const testResponse = require("../data/test-response.json");
const testExpenseResponse = require("../data/invoice-expense-response.json");

console.log("Checking built assets can be used with NodeJS...");

// Quick smoke tests:
const doc = new TextractDocument(testResponse);
assert.strictEqual(doc.nPages, 1);
assert.strictEqual(doc.pageNumber(1).nTables, 1);
doc.pageNumber(1).getLineClustersInReadingOrder();
doc.pageNumber(1).getLinesByLayoutArea();

const expense = new TextractExpense(testExpenseResponse);
assert.strictEqual(expense.nDocs, 1);
const expenseDoc = [...expense.iterDocs()][0];
assert.strictEqual(expenseDoc.nSummaryFields, 15);

console.log("Done!");
