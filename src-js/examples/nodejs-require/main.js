/**
 * Example script using TRP.js from NodeJS with CommonJS-style module `require()`s
 *
 * This script shows how you can get started with TRP using either local Amazon Textract JSON
 * response files, or calling synchronous Amazon Textract APIs.
 */
// NodeJS Built-Ins:
const assert = require("node:assert").strict;
const { mkdir, readFile, writeFile } = require("node:fs/promises");

// External Dependencies:
const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");

// TRP.js:
const { TextractDocument, TextractExpense } = require("amazon-textract-response-parser");

// You could also directly `require` static JSON test data files like this:
// (These data file imports will only work in this example project, because the files aren't
// published to NPM)
// const testResponse = require("amazon-textract-response-parser/test/data/test-response.json");
// const testExpenseResponse = require("amazon-textract-response-parser/test/data/invoice-expense-response.json");

/**
 * Quick smoke tests with pre-existing data files
 */
async function testStaticFiles() {
  const staticTestResponse = JSON.parse(await readFile("../../test/data/test-response.json", "utf-8"));
  const staticDoc = new TextractDocument(staticTestResponse);
  assert.strictEqual(staticDoc.nPages, 1);
  assert.strictEqual(staticDoc.pageNumber(1).nTables, 1);
  staticDoc.pageNumber(1).getLineClustersInReadingOrder();
  staticDoc.pageNumber(1).getLinesByLayoutArea();

  const staticExpResponse = JSON.parse(
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
  const doc = new TextractDocument(textractResponse);
  assert.strictEqual(doc.nPages, 1);
  assert.strictEqual(Math.abs(doc.pageNumber(1).getModalWordOrientationDegrees()), 0);

  // Render the test doc to an HTML file:
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await mkdir("./data-tmp", { recursive: true }).catch((_) => {});
  await writeFile("./data-tmp/doc.html", doc.html(), "utf-8");
}

testStaticFiles()
  .then(() => testCallTextract())
  .then(() => console.log("Done!"));
