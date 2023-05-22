// Node Built-Ins:
import { promises as fs } from "fs";

// External Dependencies:
import {
  TextractClient,
  AnalyzeDocumentCommand,
  AnalyzeExpenseCommand,
  DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";

// Local Dependencies:
import {
  ApiResponsePage,
  ApiResponsePages,
  TextractExpense,
  TextractDocument,
  ApiAnalyzeExpenseResponse,
} from "../../src";

const textract = new TextractClient({});

const runTestDocAssertions = (doc: TextractDocument, formsEnabled = true, tablesEnabled = true) => {
  expect(doc.nPages).toStrictEqual(1);
  const firstPage = doc.pageNumber(1);
  expect(firstPage.nLines).toStrictEqual(31);
  expect(firstPage.lineAtIndex(0).listWords().length).toStrictEqual(2);
  expect([...firstPage.iterLines()].reduce((acc, next) => acc + next.listWords().length, 0)).toStrictEqual(
    71
  );
  expect(firstPage.form.nFields).toStrictEqual(formsEnabled ? 14 : 0);
  expect(firstPage.nTables).toStrictEqual(tablesEnabled ? 1 : 0);
};

describe("TextractDocument", () => {
  it(
    "should work with AWS SDK AnalyzeDocument",
    async () => {
      const textractResponse = await textract.send(
        new AnalyzeDocumentCommand({
          Document: {
            Bytes: await fs.readFile("./test/data/default_document_4.png"),
          },
          FeatureTypes: ["FORMS", "TABLES"],
        })
      );
      let doc = new TextractDocument(textractResponse as ApiResponsePage);
      runTestDocAssertions(doc);
      doc = new TextractDocument([textractResponse] as ApiResponsePages);
      runTestDocAssertions(doc);
    },
    60 * 1000 // 60sec timeout
  );

  it(
    "should work with AWS SDK DetectDocumentText",
    async () => {
      const textractResponse = await textract.send(
        new DetectDocumentTextCommand({
          Document: {
            Bytes: await fs.readFile("./test/data/default_document_4.png"),
          },
        })
      );
      let doc = new TextractDocument(textractResponse as ApiResponsePage);
      runTestDocAssertions(doc, false, false);
      doc = new TextractDocument([textractResponse] as ApiResponsePages);
      runTestDocAssertions(doc, false, false);
    },
    60 * 1000 // 60sec timeout
  );

  it(
    "should work with AWS SDK AnalyzeExpense",
    async () => {
      const textractResponse = await textract.send(
        new AnalyzeExpenseCommand({
          Document: {
            Bytes: await fs.readFile("./test/data/default_invoice_1.png"),
          },
        })
      );
      const expense = new TextractExpense(textractResponse as unknown as ApiAnalyzeExpenseResponse);
      expect(expense.nDocs).toStrictEqual(1);
      const expenseDoc = expense.listDocs()[0];

      const testField = expenseDoc.getSummaryFieldByType("INVOICE_RECEIPT_ID");
      expect(testField).toBeTruthy();
      if (!testField) return;
      expect(testField.fieldType.text).toStrictEqual("INVOICE_RECEIPT_ID");
      expect(testField.value.text).toStrictEqual("123PQR456");
    },
    60 * 1000 // 60sec timeout
  );
});
