/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

// NodeJS Built-Ins:
const assert = require("assert").strict;

// Local Dependencies:
const { TextractDocument } = require("../../dist/umd");
const testResponse = require("../data/test-response.json");

console.log("Checking built assets can be used with NodeJS...");

// Quick smoke test:
const doc = new TextractDocument(testResponse);
assert.strictEqual(doc.nPages, 1);
assert.strictEqual(doc.pageNumber(1).nTables, 1);

console.log("Done!");
