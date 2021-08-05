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
    expect(firstPage.parentDocument).toBe(doc);
    expect(firstPage.geometry.parentObject).toBe(firstPage);

    expect(firstPage.nLines).toStrictEqual(22);
    expect(firstPage.lineAtIndex(0).words.length).toStrictEqual(2);
    expect([...firstPage.iterLines()].reduce((acc, next) => acc + next.words.length, 0)).toStrictEqual(53);
  });

  it("should throw errors on out-of-bounds pages, words and lines", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(() => doc.pageNumber(0)).toThrow(/must be between 1 and/);
    expect(() => doc.pageNumber(doc.nPages + 1)).toThrow(/must be between 1 and/);
    const page = doc.pageNumber(1);
    expect(() => page.lineAtIndex(-1)).toThrow(/Line index/);
    expect(() => page.lineAtIndex(page.nLines)).toThrow(/Line index/);
    const line = page.lineAtIndex(0);
    expect(() => line.wordAtIndex(-1)).toThrow(/Word index/);
    expect(() => line.wordAtIndex(line.words.length)).toThrow(/Word index/);
  });

  it("should correctly load basic table properties", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(table.confidence).toBeLessThanOrEqual(100);
    expect(table.geometry.parentObject).toBe(table);
  });

  it("should throw errors on out-of-bounds tables", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    expect(() => page.tableAtIndex(-1)).toThrow(/Table index/);
    expect(() => page.tableAtIndex(page.nTables)).toThrow(/Table index/);
  });

  it("should correctly load table dimensions", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.nColumns).toStrictEqual(5);
    expect(table.nRows).toStrictEqual(5);
    expect(table.nCells).toStrictEqual(25);
  });

  it("should index cells by row and column", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = [...doc.pageNumber(1).iterTables()][0];

    expect(table.cellAt(2, 2)?.text).toMatch("End Date");
    expect(table.cellAt(3, 2)?.text).toMatch("6/30/2013");
    // Strict mode:
    expect(table.cellAt(2, 2, true)?.text).toMatch("End Date");
    expect(table.cellAt(3, 2, true)?.text).toMatch("6/30/2013");
  });

  it("should fetch row cells by index", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = [...doc.pageNumber(1).iterTables()][0];

    expect(table.cellsAt(2, null).length).toStrictEqual(5);
    // Strict mode:
    expect(table.cellsAt(2, null, true).length).toStrictEqual(5);
  });

  it("should fetch column cells by index", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = [...doc.pageNumber(1).iterTables()][0];

    expect(table.cellsAt(null, 2).length).toStrictEqual(5);
    // Strict mode:
    expect(table.cellsAt(null, 2, true).length).toStrictEqual(5);
  });

  it("should iterate table rows", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = doc.pageNumber(1).tableAtIndex(0);
    let nRows = 0;
    for (const row of table.iterRows()) {
      ++nRows;
      expect(row.parentTable).toStrictEqual(table);
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

  it("should support traversal both down and up the tree", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    // Doc to LINE and back again:
    expect(page.lineAtIndex(0).parentPage.parentDocument.dict).toStrictEqual(doc.dict);
    // Word to BBox/Polygon and back again:
    const aWord = doc.pageNumber(1).lineAtIndex(0).wordAtIndex(0);
    expect(aWord.geometry.boundingBox.parentGeometry?.parentObject?.dict).toStrictEqual(aWord.dict);
    expect(aWord.geometry.polygon[0].parentGeometry?.parentObject?.dict).toStrictEqual(aWord.dict);
    // PAGE to table CELL and back again:
    expect(page.tableAtIndex(0).cellAt(1, 1)?.parentTable.parentPage.dict).toStrictEqual(page.dict);
    // PAGE to field value and back again:
    const formKeys = page.form.searchFieldsByKey("");
    expect(formKeys.length).toBeGreaterThan(0);
    expect(formKeys.length && formKeys[0].value?.parentField.parentForm.parentPage.dict).toStrictEqual(
      page.dict
    );
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
