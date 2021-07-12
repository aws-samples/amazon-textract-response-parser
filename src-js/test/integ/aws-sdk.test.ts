// Node Built-Ins:
import { promises as fs } from "fs";

// External Dependencies:
import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

// Local Dependencies:
import { ApiResponsePage, TextractDocument } from "../../src";

const textract = new TextractClient({});

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
      const doc = new TextractDocument(textractResponse as ApiResponsePage);
      expect(doc.pages.length).toStrictEqual(1);
      expect(doc.pages[0].lines.length).toStrictEqual(31);
      expect(doc.pages[0].lines[0].words.length).toStrictEqual(2);
      expect(doc.pages[0].lines.reduce((acc, next) => acc + next.words.length, 0)).toStrictEqual(71);
      expect(doc.pages[0].form.fields.length).toStrictEqual(9);
      expect(doc.pages[0].tables.length).toStrictEqual(1);
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
      const doc = new TextractDocument(textractResponse as ApiResponsePage);
      expect(doc.pages.length).toStrictEqual(1);
      expect(doc.pages[0].lines.length).toStrictEqual(31);
      expect(doc.pages[0].lines[0].words.length).toStrictEqual(2);
      expect(doc.pages[0].lines.reduce((acc, next) => acc + next.words.length, 0)).toStrictEqual(71);
      expect(doc.pages[0].form.fields.length).toStrictEqual(0);
      expect(doc.pages[0].tables.length).toStrictEqual(0);
    },
    60 * 1000 // 60sec timeout
  );
});
