/**
 * A quick smoke test that the IIFE bundle created for browsers can execute to define the library
 */
/* eslint-disable */

// Local Dependencies:
const testResponse = require("../data/test-response.json");
const fs = require("fs");
const path = require("path");

console.log("Validating IIFE browser bundle executes...");
eval(fs.readFileSync(path.join(__dirname, "../../dist/browser/trp.min.js")) + "");

console.log("Checking sub-module components are accessible through IIFE...");
const CHILD = trp.api.base.ApiRelationshipType.Child;
const ApiTextType = trp.api.content.ApiTextType;
const ApiKeyValueEntityTypeEnum = trp.api.form.ApiKeyValueEntityType;
const ApiJobStatus = trp.api.response.ApiJobStatus;
const ApiTableEntityType = trp.api.table.ApiTableEntityType;
const aggregate = trp.base.aggregate;
const Word = trp.content.Word;
const TexDoc = trp.document.TextractDocument;
const TexExp = trp.expense.TextractExpense;
const FormGeneric = trp.form.FormGeneric;
const Geometry = trp.geometry.Geometry;
const TexId = trp.id.TextractIdentity;
const QueryResultGeneric = trp.query.QueryResultGeneric;
const TableGeneric = trp.table.TableGeneric;

const aggTest = aggregate([1, 2, 3, 4], trp.base.AggregationMethod.Mean);
if (aggTest !== 2.5) {
  throw new Error(
    `Expected trp.base.aggregate([1, 2, 3, 4], "MEAN") to return 2.5: Got ${aggTest}`
  );
}

console.log("Checking IIFE browser bundle seems to work...");
const doc = new trp.TextractDocument(testResponse);
doc.pageNumber(1).getLineClustersInReadingOrder();

console.log("Done!");
