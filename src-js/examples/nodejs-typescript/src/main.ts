/**
 * Example script using TRP.js from NodeJS with ES-style module imports in TypeScript
 *
 * This script shows how you can get started with TRP using either local Amazon Textract JSON
 * response files, or calling synchronous Amazon Textract APIs.
 */
// NodeJS Built-Ins:
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";

// External Dependencies:
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";

// TRP.js:
import {
  ApiAnalyzeDocumentResponse,
  ApiAnalyzeExpenseResponse,
  TextractDocument,
  TextractExpense,
} from "amazon-textract-response-parser";

// You could also directly `import` static JSON test data files like this:
// (These data file imports will only work in this example project, because the files aren't
// published to NPM)
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const testResponse: ApiAnalyzeDocumentResponse = require("amazon-textract-response-parser/test/data/test-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const testExpenseResponse: ApiAnalyzeExpenseResponse = require("amazon-textract-response-parser/test/data/invoice-expense-response.json");

/**
 * Quick smoke tests with pre-existing data files
 */
async function testStaticFiles() {
  const staticTestResponse: ApiAnalyzeDocumentResponse = JSON.parse(
    await readFile("../../test/data/test-response.json", "utf-8"),
  );
  const staticDoc = new TextractDocument(staticTestResponse);
  assert.strictEqual(staticDoc.nPages, 1);
  assert.strictEqual(staticDoc.pageNumber(1).nTables, 1);
  staticDoc.pageNumber(1).getLineClustersInReadingOrder();
  staticDoc.pageNumber(1).getLinesByLayoutArea();

  const staticExpResponse: ApiAnalyzeExpenseResponse = JSON.parse(
    await readFile("../../test/data/invoice-expense-response.json", "utf-8"),
  );
  const staticExpense = new TextractExpense(staticExpResponse);
  assert.strictEqual(staticExpense.nDocs, 1);
  const staticExpenseDoc = [...staticExpense.iterDocs()][0];
  assert.strictEqual(staticExpenseDoc.nSummaryFields, 31);
}

/**
 * Actually call Amazon Textract and use the results
 */
async function testCallTextract() {
  const textract = new TextractClient({});
  const textractResponse = await textract.send(
    new AnalyzeDocumentCommand({
      Document: {
        Bytes: await readFile("../../test/data/default_document_4.png"),
      },
      FeatureTypes: ["FORMS", "LAYOUT", "TABLES"],
    }),
  );
  const doc = new TextractDocument(textractResponse as ApiAnalyzeDocumentResponse);
  assert.strictEqual(doc.nPages, 1);
  const angle = doc.pageNumber(1).getModalWordOrientationDegrees();
  assert.notStrictEqual(angle, null);
  assert.strictEqual(Math.abs(angle as number), 0);
}

testStaticFiles()
  .then(() => testCallTextract())
  .then(() => console.log("Done!"));
