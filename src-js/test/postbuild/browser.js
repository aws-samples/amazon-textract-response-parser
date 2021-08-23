/* eslint-disable */
// A quick smoke test that the IIFE bundle created for browsers can execute to define the library
console.log("Validating IIFE browser bundle executes...");
const _ = require("../../dist/browser/trp.min.js");
console.log("Done!");
