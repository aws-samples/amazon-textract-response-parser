import {
  ApiAnalyzeDocumentResponse,
  ApiBlockType,
  ApiCellBlock,
  ApiRelationshipType,
  ApiResponsePage,
  ApiTableBlock,
  ApiTableCellEntityType,
  ApiTableEntityType,
} from "../../src/api-models";
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

  it("gracefully handles tables with missing referenced cell blocks", () => {
    // Create a clone to avoid messing up the shared imported object:
    const responseCopy: ApiAnalyzeDocumentResponse = JSON.parse(JSON.stringify(testTableMergedCellsJson));
    // Prepend a non-existent block ID to every table's list of cells and list of merged_cells:
    const tableBlocks = responseCopy.Blocks.filter((b) => (b.BlockType === "TABLE")) as ApiTableBlock[];
    let nFakeCells = 0;
    let nFakeMergedCells = 0;
    tableBlocks.forEach((block) => {
      block.Relationships.forEach((rel) => {
        if (rel.Type === ApiRelationshipType.Child) {
          rel.Ids.unshift(`DOESNOTEXIST-${++nFakeCells}`);
        } else if (rel.Type === ApiRelationshipType.MergedCell) {
          rel.Ids.unshift(`DOESNOTEXIST-${++nFakeMergedCells}`);
        }
      });
    });
    if (nFakeCells === 0) {
      throw new Error("Test input doc had no table cell relationships to modify");
    }
    if (nFakeMergedCells === 0) {
      throw new Error("Test input doc had no table merged_cell relationships to modify");
    }

    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();
    let doc = new TextractDocument(responseCopy);
    // Should have warned once per inserted dummy block ID:
    expect(consoleWarnMock).toHaveBeenCalledTimes(nFakeCells + nFakeMergedCells);
    consoleWarnMock.mockRestore();

    // doc tables should still be functional:
    expect(
      () => {
        for (const page of doc.iterPages()) {
          for (const table of page.iterTables()) {
            table.cellAt(1, 1);
          }
        }
      }
    ).not.toThrow();
  });

  it("gracefully handles table cells with missing referenced content blocks", () => {
    // Create a clone to avoid messing up the shared imported object:
    const responseCopy: ApiAnalyzeDocumentResponse = JSON.parse(JSON.stringify(testTableMergedCellsJson));
    // Prepend a non-existent block ID to every table cell's list of content blocks:
    const cellBlocks = responseCopy.Blocks.filter((b) => (b.BlockType === "CELL")) as ApiCellBlock[];
    let nFakeBlocks = 0;
    cellBlocks.forEach((block) => {
      if (!block.Relationships) return;
      block.Relationships.filter((rel) => (rel.Type === ApiRelationshipType.Child)).forEach((rel) => {
        rel.Ids.unshift(`DOESNOTEXIST-${++nFakeBlocks}`);
      });
    });
    if (nFakeBlocks === 0) {
      throw new Error("Test input doc had no table cell child relationships to modify");
    }

    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();
    let doc = new TextractDocument(responseCopy);
    // Should have warned once per inserted dummy block ID:
    expect(consoleWarnMock).toHaveBeenCalledTimes(nFakeBlocks);
    consoleWarnMock.mockRestore();

    // doc tables should still be functional:
    expect(
      () => {
        for (const page of doc.iterPages()) {
          for (const table of page.iterTables()) {
            for (const row of table.iterRows()) {
              for (const cell of row.iterCells()) {
                cell.text;
              }
            }
          }
        }
      }
    ).not.toThrow();
  });

  it("differentiates structured from semi-structured tables", () => {
    // Create a clone to avoid messing up the shared imported object:
    const responseCopy: ApiAnalyzeDocumentResponse = JSON.parse(JSON.stringify(testResponseJson));
  
    // Check correct behaviour on the response object as-is:
    let doc = new TextractDocument(responseCopy);
    let table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.tableType).toStrictEqual(ApiTableEntityType.StructuredTable);
  
    // Find and manipulate the TABLE block, and check the parser responds correctly:
    const tableBlocks = responseCopy.Blocks.filter((block) => block.BlockType === ApiBlockType.Table);
    expect(tableBlocks.length).toStrictEqual(1);
    const tableBlock = tableBlocks[0] as ApiTableBlock;
  
    tableBlock.EntityTypes = ["SEMI_STRUCTURED_TABLE" as ApiTableEntityType];
    expect((new TextractDocument(responseCopy)).pageNumber(1).tableAtIndex(0).tableType).toStrictEqual(
      ApiTableEntityType.SemiStructuredTable
    );

    tableBlock.EntityTypes = [
      "STRUCTURED_TABLE" as ApiTableEntityType,
      "SEMI_STRUCTURED_TABLE" as ApiTableEntityType,
    ];
    expect(() => ((new TextractDocument(responseCopy)).pageNumber(1).tableAtIndex(0).tableType))
      .toThrow("multiple conflicting table types");
  
    delete tableBlock.EntityTypes;
    expect((new TextractDocument(responseCopy)).pageNumber(1).tableAtIndex(0).tableType).toBeNull();
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

  it("queries table cell EntityTypes", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const table = page.tableAtIndex(0);
    expect(
      table.rowAt(1).listCells().filter((c) => c.hasEntityTypes(ApiTableCellEntityType.ColumnHeader)).length
    ).toStrictEqual(5);
    
    // Query one type at a time:
    for (const row of table.iterRows()) {
      for (const cell of row.iterCells()) {
        if (cell.rowIndex === 1) {
          expect(cell.hasEntityTypes(ApiTableCellEntityType.ColumnHeader)).toStrictEqual(true);
        } else {
          expect(cell.hasEntityTypes(ApiTableCellEntityType.ColumnHeader)).toBeFalsy();
        }
      }
    }

    // Query multiple types at once:
    const firstCell = table.cellAt(1, 1);
    expect(firstCell?.hasEntityTypes([ApiTableCellEntityType.ColumnHeader, ApiTableCellEntityType.Footer]))
      .toStrictEqual(true);
    expect(firstCell?.hasEntityTypes([ApiTableCellEntityType.Summary, ApiTableCellEntityType.Footer]))
      .toStrictEqual(false);
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
