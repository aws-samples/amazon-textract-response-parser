// Node Built-Ins:
import { promises as fs } from "fs";

// External Dependencies:
import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

// Local Dependencies:
import { ApiResponsePage, ApiResponsePages, TextractDocument } from "../../src";

const textract = new TextractClient({});

const runTestDocAssertions = (doc: TextractDocument, formsEnabled = true, tablesEnabled = true) => {
  expect(doc.nPages).toStrictEqual(1);
  const firstPage = doc.pageNumber(1);
  expect(firstPage.nLines).toStrictEqual(31);
  expect(firstPage.lineAtIndex(0).words.length).toStrictEqual(2);
  expect([...firstPage.iterLines()].reduce((acc, next) => acc + next.words.length, 0)).toStrictEqual(71);
  expect(firstPage.form.nFields).toStrictEqual(formsEnabled ? 9 : 0);
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
});
