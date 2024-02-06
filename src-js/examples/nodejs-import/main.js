/**
 * Example script using TRP.js from NodeJS with ES-style module imports
 *
 * This script shows how you can get started with TRP using either local Amazon Textract JSON
 * response files, or calling synchronous Amazon Textract APIs.
 */
// NodeJS Built-Ins:
import { strict as assert } from "node:assert";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// External Dependencies:
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";

// TRP.js:
import { TextractDocument, TextractExpense } from "amazon-textract-response-parser";

// You could also directly `import` static JSON test data files like this:
// (These data file imports will only work in this example project, because the files aren't
// published to NPM)
// import staticTestResponse from "amazon-textract-response-parser/test/data/test-response.json" assert { type: "json" };
// import staticExpResponse from "amazon-textract-response-parser/test/data/invoice-expense-response.json" assert { type: "json" };

// Quick smoke tests with pre-existing data files:
// (Note top-level `await`s like this may only work with the `--experimental-specifier-resolution` flag.
// Otherwise you may need to wrap the code in an `async function`)
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

// Actually call Amazon Textract and use the results:
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

console.log("Done!");
