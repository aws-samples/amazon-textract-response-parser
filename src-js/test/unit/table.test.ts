import { ApiBlockType, ApiResponsePage } from "../../src/api-models";
import { TextractDocument, Word } from "../../src/document";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testTableMergedCellsJson: ApiResponsePage = require("../data/table-example-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testResponseJson: ApiResponsePage = require("../data/test-response.json");

describe("Table", () => {
  it("loads and navigates basic table properties", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    expect(page.nTables).toStrictEqual(1);

    const iterTables = [...page.iterTables()];
    const tableList = page.listTables();
    const table = page.tableAtIndex(0);
    expect(iterTables.length).toStrictEqual(page.nTables);
    expect(tableList.length).toStrictEqual(page.nTables);
    expect(table).toBe(iterTables[0]);
    for (let ix = 0; ix < page.nLines; ++ix) {
      expect(iterTables[ix]).toBe(tableList[ix]);
    }

    expect(table.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(table.confidence).toBeLessThanOrEqual(100);
    expect(table.geometry.parentObject).toBe(table);
  });

  it("throws errors on out-of-bounds tables", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    expect(() => page.tableAtIndex(-1)).toThrow(/Table index/);
    expect(() => page.tableAtIndex(page.nTables)).toThrow(/Table index/);
  });

  it("loads table dimensions", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.nColumns).toStrictEqual(5);
    expect(table.nRows).toStrictEqual(4);
    expect(table.nCells).toStrictEqual(20);
  });

  it("indexes table cells by row and column", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = [...doc.pageNumber(1).iterTables()][0];

    expect(table.cellAt(1, 2)?.text).toMatch("End Date");
    expect(table.cellAt(2, 2)?.text).toMatch("6/30/2011");
    // Explicitly ignoring merged cells:
    expect(table.cellAt(1, 2, true)?.text).toMatch("End Date");
    expect(table.cellAt(2, 2, true)?.text).toMatch("6/30/2011");
  });

  it("indexes merged cells by row and column", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = doc.pageNumber(1).listTables()[0];

    // Horizontal merge:
    expect(table.cellAt(2, 1)?.text).toMatch("Previous Balance");
    expect(table.cellAt(2, 4)?.text).toMatch("Previous Balance");
    expect(table.cellAt(2, 4, true)?.text).toStrictEqual("");
    // Merged cell contents equals sum of split cell contents:
    const mergedContents = table.cellAt(2, 1)?.listContent() || [];
    const splitContents = [1, 2, 3, 4]
      .map((ixCol) => table.cellAt(2, ixCol, true)?.listContent() || [])
      .flat();
    expect(mergedContents.map((c) => c.id)).toStrictEqual(splitContents.map((c) => c.id));
    // Vertical merge:
    expect(table.cellAt(3, 1)?.text).toMatch("2022-01-01");
    expect(table.cellAt(4, 1)?.text).toMatch("2022-01-01");
    expect(table.cellAt(3, 1, true)?.text).toStrictEqual("");
  });

  it("fetches table row cells by index", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).listTables()[0];

    // No merges:
    expect(table.cellsAt(1, null).length).toStrictEqual(5);
    expect(table.cellsAt(1, null, true).length).toStrictEqual(5);
    // Merges in row, no merges across rows:
    expect(table.cellsAt(2, null).length).toStrictEqual(2);
    expect(table.cellsAt(2, null, true).length).toStrictEqual(5);
    // Includes cells merged across rows:
    expect(table.cellsAt(3, null).length).toStrictEqual(5);
    expect(table.cellsAt(3, null, true).length).toStrictEqual(5);
  });

  it("fetches table column cells by index", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).listTables()[0];

    // No merges:
    expect(table.cellsAt(null, 5).length).toStrictEqual(6);
    expect(table.cellsAt(null, 5, true).length).toStrictEqual(6);
    // Cross-column merges:
    expect(table.cellsAt(null, 4).length).toStrictEqual(6);
    expect(table.cellsAt(null, 4, true).length).toStrictEqual(6);
    // Cross-column and in-column merges:
    expect(table.cellsAt(null, 1).length).toStrictEqual(5);
    expect(table.cellsAt(null, 1, true).length).toStrictEqual(6);
  });

  it("iterates table rows", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = doc.pageNumber(1).tableAtIndex(0);
    const tableRows = table.listRows();
    expect(tableRows.length).toStrictEqual(table.nRows);
    let nRows = 0;
    for (const row of table.iterRows()) {
      ++nRows;
      expect(row.parentTable).toBe(table);
    }
    expect(nRows).toStrictEqual(table.nRows);
    expect(nRows).toStrictEqual(4);
  });

  it("iterates table rows with cross-row merged cell repetition", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    // Row 3 or 4 will be one cell short if a cross-row merged cell is not repeated:
    const expectedCellsPerRow = [5, 2, 5, 5, 5, 2];

    const table = doc.pageNumber(1).tableAtIndex(0);
    const tableRows = table.listRows();
    expect(tableRows.length).toStrictEqual(table.nRows);
    let nRows = 0;
    for (const row of table.iterRows(true)) {
      expect(row.nCells).toStrictEqual(expectedCellsPerRow[nRows]);
      ++nRows;
    }
    expect(nRows).toStrictEqual(table.nRows);
    expect(nRows).toStrictEqual(6);
  });

  it("lists table rows", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.listRows(true).length).toStrictEqual(table.nRows);
  });

  it("navigates table row cells", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).tableAtIndex(0);
    const expectedRowLengths = [5, 2, 5, 4, 5, 2];
    let nCellsTotal = 0;
    let nRows = 0;
    let targetCellFound = false;
    for (const row of table.iterRows(false)) {
      const rowCells = row.listCells();
      expect(rowCells.length).toStrictEqual(expectedRowLengths[nRows]);
      let nCells = 0;
      ++nRows;
      const indexedCells = table.cellsAt(nRows, null).filter((c) => c.rowIndex === nRows);
      expect(rowCells.length).toStrictEqual(indexedCells.length);
      for (const cell of row.iterCells()) {
        ++nCells;
        ++nCellsTotal;
        expect(indexedCells.indexOf(cell)).toBeGreaterThanOrEqual(0);
        expect(rowCells.indexOf(cell)).toBeGreaterThanOrEqual(0);
        expect(cell.confidence).toBeGreaterThan(1); // (<1% very unlikely)
        expect(cell.confidence).toBeLessThanOrEqual(100);
        expect(cell.geometry.parentObject).toBe(cell);
        expect(cell.str()).toStrictEqual(cell.text);
        if (nRows === 4 && nCells === 1) {
          expect(cell.text).toMatch("Payment - Utility");
          expect(
            cell
              .listContent()
              .filter((c) => c.blockType === ApiBlockType.Word)
              .map((w) => (w as Word).text)
              .join(" ")
          ).toMatch("Payment - Utility");
          targetCellFound = true;
        }
      }
      expect(nCells).toStrictEqual(row.nCells);
    }
    expect(nCellsTotal).toStrictEqual(expectedRowLengths.reduce((acc, next) => acc + next, 0));
    expect(targetCellFound).toStrictEqual(true);
  });

  it("exposes raw table dicts with traversal up and down the tree", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const table = page.tableAtIndex(0);
    const firstCell = table.cellAt(1, 1);
    expect(firstCell?.parentTable.dict).toBe(table.dict);
    expect(firstCell?.parentTable.parentPage.dict).toBe(page.dict);
  });

  it("stringifies tables to contain each row's representation", () => {
    const doc = new TextractDocument(testResponseJson);
    const table = doc.pageNumber(1).tableAtIndex(0);
    const rowStrs = table.listRows().map((row) => row.str());
    const tableStr = table.str();
    let lastDetectedLoc = 0;
    rowStrs.forEach((rowStr) => {
      const rowStrLoc = tableStr.slice(lastDetectedLoc).indexOf(rowStr);
      expect(rowStrLoc).toBeGreaterThanOrEqual(0);
      lastDetectedLoc += rowStrLoc + rowStr.length;
    });
  });
});
