/**
 * Example script using TRP.js from NodeJS with ES-style module imports
 */
// NodeJS Built-Ins:
import { strict as assert } from "assert";

// TRP.js:
import { TextractDocument, TextractExpense } from "amazon-textract-response-parser";

// Test data files:
// (These data file imports will only work in this example project, because the files aren't
// published to NPM)
import testResponse from "amazon-textract-response-parser/test/data/test-response.json" assert { type: "json" };
import testExpenseResponse from "amazon-textract-response-parser/test/data/invoice-expense-response.json" assert { type: "json" };

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
