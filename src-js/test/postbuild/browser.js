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

console.log("Checking IIFE browser bundle seems to work...");
const doc = new trp.TextractDocument(testResponse);
doc.pageNumber(1).getLineClustersInReadingOrder();

console.log("Done!");
