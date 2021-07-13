import { ApiResponsePage, ApiResponsePages, Line, TextractDocument } from "../../src";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testFailedJson: ApiResponsePage = require("../data/test-failed-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testInProgressJson: ApiResponsePage = require("../data/test-inprogress-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testResponseJson: ApiResponsePage = require("../data/test-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testMultiColumnJson: ApiResponsePage = require("../data/test-multicol-response.json");

const EXPECTED_MULTILINE_SEQ_LOWER = [
  "multi-column test document",
  "a sample document with",
  "this section has two columns",
  "the left column contains",
  "the right column",
  "correct processing",
  "a final footer",
];

describe("TextractDocument", () => {
  it("should throw status error on failed async job JSONs (list)", () => {
    expect(() => {
      new TextractDocument([testFailedJson] as ApiResponsePages);
    }).toThrowError(/status.*FAILED/);
  });

  it("should throw status error on still-in-progress async job JSON (individual)", () => {
    expect(() => {
      new TextractDocument(testInProgressJson);
    }).toThrowError(/content/);
  });

  it("should parse the test JSON without error", () => {
    expect(() => {
      new TextractDocument(testResponseJson);
    }).not.toThrowError();
  });

  it("should correctly load pages, lines and words", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.nPages).toStrictEqual(1);
    const firstIteratorPage = [...doc.iterPages()][0];
    const firstPage = doc.pageNumber(1);
    expect(firstIteratorPage).toStrictEqual(firstPage);
    expect(firstPage.nLines).toStrictEqual(22);
    expect(firstPage.lineAtIndex(0).words.length).toStrictEqual(2);
    expect([...firstPage.iterLines()].reduce((acc, next) => acc + next.words.length, 0)).toStrictEqual(53);
  });

  it("should correctly load table dimensions", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.nColumns).toStrictEqual(5);
    expect(table.nRows).toStrictEqual(5);
  });

  it("should index cells by row and column", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = [...doc.pageNumber(1).iterTables()][0];

    expect(table.cellAt(2, 2)?.text).toMatch("End Date");
    expect(table.cellAt(3, 2)?.text).toMatch("6/30/2013");
  });

  it("should fetch row cells by index", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = [...doc.pageNumber(1).iterTables()][0];

    expect(table.cellsAt(2, null).length).toStrictEqual(5);
  });

  it("should fetch column cells by index", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = [...doc.pageNumber(1).iterTables()][0];

    expect(table.cellsAt(null, 2).length).toStrictEqual(5);
  });

  it("should iterate table rows", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = doc.pageNumber(1).tableAtIndex(0);
    let nRows = 0;
    for (const row of table.iterRows()) {
      ++nRows;
    }
    expect(nRows).toStrictEqual(table.nRows);
    expect(nRows).toStrictEqual(5);
  });

  it("should iterate table row cells", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = doc.pageNumber(1).tableAtIndex(0);
    let nCellsTotal = 0;
    let nRows = 0;
    let targetCellFound = false;
    for (const row of table.iterRows()) {
      let nCells = 0;
      ++nRows;
      for (const cell of row.iterCells()) {
        ++nCells;
        ++nCellsTotal;
        if (nRows === 2 && nCells === 4) {
          expect(cell.text).toMatch("Position Held");
          targetCellFound = true;
        }
      }
      expect(nCells).toStrictEqual(row.nCells);
    }
    expect(nCellsTotal).toStrictEqual(25);
    expect(targetCellFound).toStrictEqual(true);
  });

  it("should correctly load forms", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).form.nFields).toStrictEqual(4);
  });

  it("should retrieve form fields by key", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).form.getFieldByKey("Phone Number:")?.value?.text).toStrictEqual("555-0100");
  });

  it("should search form fields by key", () => {
    const doc = new TextractDocument(testResponseJson);
    const results = doc.pageNumber(1).form.searchFieldsByKey("Home Addr");
    expect(results.length).toStrictEqual(1);
    expect(results[0].value?.text).toMatch("123 Any Street");
  });

  it("should sort lines correctly for multi-column documents", () => {
    const doc = new TextractDocument(testMultiColumnJson);

    const readingOrder = doc.pageNumber(1).getLineClustersInReadingOrder();
    expect(readingOrder.length).not.toBeLessThan(1);

    const sortedLinesTextLower = ([] as Line[])
      .concat(...readingOrder)
      .map((l) => l.text.toLocaleLowerCase());
    expect(sortedLinesTextLower.length).not.toBeLessThan(EXPECTED_MULTILINE_SEQ_LOWER.length);
    let ixTest = 0;
    sortedLinesTextLower.forEach((lineText) => {
      const matchIx = EXPECTED_MULTILINE_SEQ_LOWER.findIndex((seq) => lineText.indexOf(seq) >= 0);
      if (matchIx >= 0) {
        // We compare the strings first here to make failed assertions a bit more meaningful:
        expect(EXPECTED_MULTILINE_SEQ_LOWER[matchIx]).toStrictEqual(EXPECTED_MULTILINE_SEQ_LOWER[ixTest]);
        expect(matchIx).toStrictEqual(ixTest);
        ++ixTest;
      }
    });
    expect(ixTest).toStrictEqual(EXPECTED_MULTILINE_SEQ_LOWER.length);
  });

  it("should output text correctly for multi-column documents", () => {
    const doc = new TextractDocument(testMultiColumnJson);

    const sortedLinesTextLower = doc.pageNumber(1).getTextInReadingOrder().toLocaleLowerCase().split("\n");
    expect(sortedLinesTextLower.length).not.toBeLessThan(EXPECTED_MULTILINE_SEQ_LOWER.length);
    let ixTest = 0;
    sortedLinesTextLower.forEach((lineText) => {
      const matchIx = EXPECTED_MULTILINE_SEQ_LOWER.findIndex((seq) => lineText.indexOf(seq) >= 0);
      if (matchIx >= 0) {
        // We compare the strings first here to make failed assertions a bit more meaningful:
        expect(EXPECTED_MULTILINE_SEQ_LOWER[matchIx]).toStrictEqual(EXPECTED_MULTILINE_SEQ_LOWER[ixTest]);
        expect(matchIx).toStrictEqual(ixTest);
        ++ixTest;
      }
    });
    expect(ixTest).toStrictEqual(EXPECTED_MULTILINE_SEQ_LOWER.length);
  });

  it("should detect 0 orientation for perfectly straight pages", () => {
    const doc = new TextractDocument(testMultiColumnJson);

    for (const page of doc.iterPages()) {
      expect(page.getModalWordOrientationDegrees()).toStrictEqual(0);
    }
  });
});
