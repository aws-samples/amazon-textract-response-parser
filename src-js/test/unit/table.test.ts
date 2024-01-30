import { ApiBlockType, ApiRelationshipType } from "../../src/api-models/base";
import { ApiAnalyzeDocumentResponse, ApiResponsePage } from "../../src/api-models/response";
import {
  ApiCellBlock,
  ApiTableBlock,
  ApiTableCellEntityType,
  ApiTableEntityType,
} from "../../src/api-models/table";
import { AggregationMethod } from "../../src/base";
import { Page, TextractDocument, Word } from "../../src/document";
import { CellGeneric, MergedCellGeneric, TableFooterGeneric, TableTitleGeneric } from "../../src/table";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testTableMergedCellsJson: ApiResponsePage = require("../data/table-example-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testResponseJson: ApiResponsePage = require("../data/test-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testTitleFootersJson: ApiAnalyzeDocumentResponse = require("../data/financial-document-response.json");

const REFERENCE_TABLE_NO_CAPTION_HTML = `<table>
\t<tr>
\t\t<th>Date</th>
\t\t<th>Description</th>
\t\t<th>Credit</th>
\t\t<th>Debit</th>
\t\t<th>Balance</th>
\t</tr>
\t<tr>
\t\t<td colspan="4">Previous Balance</td>
\t\t<td>11,000</td>
\t</tr>
\t<tr>
\t\t<td rowspan="2">2022-01-01</td>
\t\t<td>Payment - Credit Card</td>
\t\t<td></td>
\t\t<td>1,000</td>
\t\t<td>10,000</td>
\t</tr>
\t<tr>
\t\t<td>Payment - Utility</td>
\t\t<td></td>
\t\t<td>40</td>
\t\t<td>9,960</td>
\t</tr>
\t<tr>
\t\t<td>2022-01-02</td>
\t\t<td>Deposit</td>
\t\t<td>1,000</td>
\t\t<td></td>
\t\t<td>10,960</td>
\t</tr>
\t<tr>
\t\t<td colspan="4">Ending Balance</td>
\t\t<td>10,960</td>
\t</tr>
</table>`;

const REFERENCE_TABLE_WITH_HEADER_HTML = `<table>
\t<caption style="caption-side: top">
\t\tPrevious Employment History
\t</caption>
\t<tr>
\t\t<th>Start Date</th>
\t\t<th>End Date</th>
\t\t<th>Employer Name</th>
\t\t<th>Position Held</th>
\t\t<th>Reason for leaving</th>
\t</tr>
\t<tr>
\t\t<td>1/15/2009</td>
\t\t<td>6/30/2011</td>
\t\t<td>Any Company</td>
\t\t<td>Assistant baker</td>
\t\t<td>relocated</td>
\t</tr>
\t<tr>
\t\t<td>7/1/2011</td>
\t\t<td>8/10/2013</td>
\t\t<td>Example Corp.</td>
\t\t<td>Baker</td>
\t\t<td>better opp.</td>
\t</tr>
\t<tr>
\t\t<td>8/15/2013</td>
\t\t<td>Present</td>
\t\t<td>AnyCompany</td>
\t\t<td>head baker</td>
\t\t<td>N/A, current</td>
\t</tr>
</table>`;

describe("MergedCell", () => {
  it("links through to sub-cells", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = doc.pageNumber(1).listTables()[0];

    // Horizontal merge:
    const horzMergedCell = table.cellAt(2, 1) as MergedCellGeneric<Page>;
    expect(horzMergedCell.blockType).toStrictEqual(ApiBlockType.MergedCell);
    expect(horzMergedCell.nSubCells).toStrictEqual(4);
    expect(horzMergedCell.text).toStrictEqual("Previous Balance");
    const horzSubCells = horzMergedCell.listSubCells();
    expect(horzSubCells.length).toStrictEqual(horzMergedCell.nSubCells);
    let nSubCells = 0;
    for (const subCell of horzMergedCell.iterSubCells()) {
      expect(subCell).toBe(horzSubCells[nSubCells]);
      expect("Previous Balance".indexOf(subCell.text)).toBeGreaterThanOrEqual(0);
      ++nSubCells;
    }
    expect(nSubCells).toStrictEqual(horzMergedCell.nSubCells);
  });

  it("renders semantic HTML", () => {
    // With colspans and rowspans:
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table).toBeTruthy();
    const hMergedCell = table.cellAt(2, 1) as MergedCellGeneric<Page>;
    expect(hMergedCell.html()).toStrictEqual('<td colspan="4">Previous Balance</td>');
    const vMergedCell = table.cellAt(3, 1) as MergedCellGeneric<Page>;
    expect(vMergedCell.html()).toStrictEqual('<td rowspan="2">2022-01-01</td>');

    // Using <th> for header cells:
    const docWithEntityTypes = new TextractDocument(testResponseJson);
    const tableWithHeader = docWithEntityTypes.pageNumber(1).tableAtIndex(0);
    expect(tableWithHeader).toBeTruthy();
    const headerCell = table.cellAt(1, 1);
    if (!headerCell) throw new Error("Expected table cell not to be undefined");
    expect(headerCell.html()).toStrictEqual("<th>Date</th>");
  });

  it("escapes forbidden entities in cell text for html()", () => {
    const responseCopy = JSON.parse(JSON.stringify(testTableMergedCellsJson));
    const doc = new TextractDocument(responseCopy);
    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table).toBeTruthy();
    const cell = table.cellAt(2, 1) as MergedCellGeneric<Page>;
    expect(cell).toBeTruthy();
    const word = cell.listContent().filter((c) => c.blockType === ApiBlockType.Word)[0] as Word;
    const origText = word.dict.Text;
    word.dict.Text = `<!DOCTYPE><html>'woof"${origText}`;
    // Check the content gets escaped:
    expect(cell.html()).toContain(`&lt;!DOCTYPE&gt;&lt;html&gt;'woof"${origText}`);
  });
});

describe("TableFooter", () => {
  it("exposes table footer properties", () => {
    const doc = new TextractDocument(testTitleFootersJson);
    const tableFooter = doc.pageNumber(1).tableAtIndex(0).firstFooter as TableFooterGeneric<Page>;
    expect(tableFooter).not.toBeUndefined();
    expect(tableFooter.blockType).toStrictEqual(ApiBlockType.TableFooter);
    expect(tableFooter.confidence).toBeGreaterThan(1);
    expect(tableFooter.confidence).toBeLessThan(100);
    expect(tableFooter.text).toStrictEqual("** Less than US$50,000.");
    expect(tableFooter.html()).toStrictEqual(tableFooter.text);
    const tableFooterStr = tableFooter.str();
    expect(tableFooterStr.indexOf("==== [Table footer] ====\n")).toStrictEqual(0);
    expect(tableFooterStr.indexOf(tableFooter.text)).toStrictEqual("==== [Table footer] ====\n".length);
  });

  it("escapes forbidden entities in footer text for html()", () => {
    const responseCopy = JSON.parse(JSON.stringify(testTitleFootersJson));
    const doc = new TextractDocument(responseCopy);
    const tableFooter = doc.pageNumber(1).tableAtIndex(0).firstFooter as TableFooterGeneric<Page>;
    expect(tableFooter).not.toBeUndefined();

    // Manipulate the underlying dict to insert non-HTML-safe text:
    const word = tableFooter.listWords()[0];
    const origText = word.dict.Text;
    word.dict.Text = `<!DOCTYPE><html>'woof"${origText}`;
    // Check the content gets escaped:
    expect(tableFooter.html()).toContain(`&lt;!DOCTYPE&gt;&lt;html&gt;'woof"${origText}`);
  });
});

describe("TableTitle", () => {
  it("exposes table title properties", () => {
    const doc = new TextractDocument(testTitleFootersJson);
    const tableTitle = doc.pageNumber(1).tableAtIndex(0).firstTitle as TableTitleGeneric<Page>;
    expect(tableTitle).not.toBeUndefined();
    expect(tableTitle.blockType).toStrictEqual(ApiBlockType.TableTitle);
    expect(tableTitle.confidence).toBeGreaterThan(1);
    expect(tableTitle.confidence).toBeLessThan(100);
    expect(tableTitle.listWords().length).toBeGreaterThan(0);
    expect(tableTitle.text).toStrictEqual("The changes in total assets of these accounts were as follows:");
    expect(tableTitle.html()).toStrictEqual(tableTitle.text);
    const tableTitleStr = tableTitle.str();
    expect(tableTitleStr.indexOf("==== [Table header] ====\n")).toStrictEqual(0);
    expect(tableTitleStr.indexOf(tableTitle.text)).toStrictEqual("==== [Table header] ====\n".length);
  });

  it("escapes forbidden entities in title text for html()", () => {
    const responseCopy = JSON.parse(JSON.stringify(testTitleFootersJson));
    const doc = new TextractDocument(responseCopy);
    const tableTitle = doc.pageNumber(1).tableAtIndex(0).firstTitle as TableTitleGeneric<Page>;
    expect(tableTitle).not.toBeUndefined();

    // Manipulate the underlying dict to insert non-HTML-safe text:
    const word = tableTitle.listWords()[0];
    const origText = word.dict.Text;
    word.dict.Text = `<!DOCTYPE><html>'woof"${origText}`;
    // Check the content gets escaped:
    expect(tableTitle.html()).toContain(`&lt;!DOCTYPE&gt;&lt;html&gt;'woof"${origText}`);
  });
});

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
    const tableBlocks = responseCopy.Blocks.filter((b) => b.BlockType === "TABLE") as ApiTableBlock[];
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
    const doc = new TextractDocument(responseCopy);
    // Should have warned once per inserted dummy block ID:
    expect(consoleWarnMock).toHaveBeenCalledTimes(nFakeCells + nFakeMergedCells);
    consoleWarnMock.mockRestore();

    // doc tables should still be functional:
    expect(() => {
      for (const page of doc.iterPages()) {
        for (const table of page.iterTables()) {
          table.cellAt(1, 1);
        }
      }
    }).not.toThrow();
  });

  it("warns on unknown Relationship types in TABLE blocks", () => {
    // Create a clone to avoid messing up the shared imported object:
    const responseCopy: ApiAnalyzeDocumentResponse = JSON.parse(JSON.stringify(testTableMergedCellsJson));
    // Prepend a non-existent block ID to every table's list of cells and list of merged_cells:
    const tableBlocks = responseCopy.Blocks.filter((b) => b.BlockType === "TABLE") as ApiTableBlock[];
    const dummyRel = {
      Ids: ["DUMMY-1", "DUMMY-2"],
      Type: "FAKE_RELATIONSHIP_TYPE" as ApiRelationshipType.Child,
    };
    tableBlocks[0].Relationships.push(dummyRel);

    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();
    const doc = new TextractDocument(responseCopy);
    // Should have warned once per nonexistent cell, plus once for the rel type:
    expect(consoleWarnMock).toHaveBeenCalledTimes(1 + dummyRel.Ids.length);
    for (const callArgs of consoleWarnMock.mock.calls) {
      // Either a warning about the non-existent block ID or the fake relationship
      expect(callArgs[0]).toMatch(/(DUMMY-\d|FAKE_RELATIONSHIP_TYPE)/g);
    }
    consoleWarnMock.mockRestore();

    // doc tables should still be functional:
    expect(() => {
      for (const page of doc.iterPages()) {
        for (const table of page.iterTables()) {
          table.cellAt(1, 1);
        }
      }
    }).not.toThrow();
  });

  // TODO: Is this the preferred behavior?
  // At one time it would just gloss over missing content blocks, and e.g.QueryInstance still does
  it("parses, but errors on content access for table cells with missing referenced content blocks", () => {
    // Create a clone to avoid messing up the shared imported object:
    const responseCopy: ApiAnalyzeDocumentResponse = JSON.parse(JSON.stringify(testTableMergedCellsJson));
    // Prepend a non-existent block ID to every table cell's list of content blocks:
    const cellBlocks = responseCopy.Blocks.filter((b) => b.BlockType === "CELL") as ApiCellBlock[];
    let nFakeBlocks = 0;
    cellBlocks.forEach((block) => {
      if (!block.Relationships) return;
      block.Relationships.filter((rel) => rel.Type === ApiRelationshipType.Child).forEach((rel) => {
        rel.Ids.unshift(`DOESNOTEXIST-${++nFakeBlocks}`);
      });
    });
    if (nFakeBlocks === 0) {
      throw new Error("Test input doc had no table cell child relationships to modify");
    }

    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();
    const doc = new TextractDocument(responseCopy);
    // Should have warned once per inserted dummy block ID:
    expect(consoleWarnMock).toHaveBeenCalledTimes(nFakeBlocks);
    consoleWarnMock.mockRestore();

    // doc tables should still be functional:
    expect(() => {
      for (const page of doc.iterPages()) {
        for (const table of page.iterTables()) {
          for (const row of table.iterRows()) {
            for (const cell of row.iterCells()) {
              cell.text;
            }
          }
        }
      }
    }).toThrow();
  });

  it("differentiates structured from semi-structured tables", () => {
    // Create a clone to avoid messing up the shared imported object:
    const responseCopy: ApiAnalyzeDocumentResponse = JSON.parse(JSON.stringify(testResponseJson));

    // Check correct behaviour on the response object as-is:
    const doc = new TextractDocument(responseCopy);
    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.tableType).toStrictEqual(ApiTableEntityType.StructuredTable);

    // Find and manipulate the TABLE block, and check the parser responds correctly:
    const tableBlocks = responseCopy.Blocks.filter((block) => block.BlockType === ApiBlockType.Table);
    expect(tableBlocks.length).toStrictEqual(1);
    const tableBlock = tableBlocks[0] as ApiTableBlock;

    tableBlock.EntityTypes = ["SEMI_STRUCTURED_TABLE" as ApiTableEntityType];
    expect(new TextractDocument(responseCopy).pageNumber(1).tableAtIndex(0).tableType).toStrictEqual(
      ApiTableEntityType.SemiStructuredTable,
    );

    tableBlock.EntityTypes = [
      "STRUCTURED_TABLE" as ApiTableEntityType,
      "SEMI_STRUCTURED_TABLE" as ApiTableEntityType,
    ];
    expect(() => new TextractDocument(responseCopy).pageNumber(1).tableAtIndex(0).tableType).toThrow(
      "multiple conflicting table types",
    );

    delete tableBlock.EntityTypes;
    expect(new TextractDocument(responseCopy).pageNumber(1).tableAtIndex(0).tableType).toBeNull();
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
    expect(table.cellAt(2, 2, { ignoreMerged: false })?.text).toMatch("6/30/2011");
    // Explicitly ignoring merged cells:
    expect(table.cellAt(1, 2, { ignoreMerged: true })?.text).toMatch("End Date");
    expect(table.cellAt(2, 2, { ignoreMerged: true })?.text).toMatch("6/30/2011");
  });

  it("indexes merged cells by row and column", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    expect(doc.pageNumber(1).nTables).toStrictEqual(1);

    const table = doc.pageNumber(1).listTables()[0];

    // Horizontal merge:
    expect(table.cellAt(2, 1)?.text).toMatch("Previous Balance");
    expect(table.cellAt(2, 4)?.text).toMatch("Previous Balance");
    expect(table.cellAt(2, 4, { ignoreMerged: true })?.text).toStrictEqual("");
    // Merged cell contents equals sum of split cell contents:
    const mergedContents = table.cellAt(2, 1)?.listContent() || [];
    const splitContents = [1, 2, 3, 4]
      .map((ixCol) => table.cellAt(2, ixCol, { ignoreMerged: true })?.listContent() || [])
      .flat();
    expect(mergedContents.map((c) => c.id)).toStrictEqual(splitContents.map((c) => c.id));
    // Vertical merge:
    expect(table.cellAt(3, 1)?.text).toMatch("2022-01-01");
    expect(table.cellAt(4, 1)?.text).toMatch("2022-01-01");
    expect(table.cellAt(3, 1, { ignoreMerged: true })?.text).toStrictEqual("");

    // Check overall total number of cells reflects the merged cells:
    expect(table.nCells).toBeLessThan(table.nColumns * table.nRows);
    expect(table.nCells).toStrictEqual(23);
  });

  it("fetches table row cells by index", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).listTables()[0];

    // No merges:
    expect(table.cellsAt(1, null).length).toStrictEqual(5);
    expect(table.cellsAt(1, null, { ignoreMerged: true }).length).toStrictEqual(5);
    // Merges in row, no merges across rows:
    expect(table.cellsAt(2, null).length).toStrictEqual(2);
    expect(table.cellsAt(2, null, { ignoreMerged: true }).length).toStrictEqual(5);
    // Includes cells merged across rows:
    expect(table.cellsAt(3, null).length).toStrictEqual(5);
    expect(table.cellsAt(3, null, { ignoreMerged: true }).length).toStrictEqual(5);
  });

  it("fetches table column cells by index", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).listTables()[0];

    // No merges:
    expect(table.cellsAt(null, 5).length).toStrictEqual(6);
    expect(table.cellsAt(null, 5, { ignoreMerged: true }).length).toStrictEqual(6);
    // Cross-column merges:
    expect(table.cellsAt(null, 4).length).toStrictEqual(6);
    expect(table.cellsAt(null, 4, { ignoreMerged: true }).length).toStrictEqual(6);
    // Cross-column and in-column merges:
    expect(table.cellsAt(null, 1).length).toStrictEqual(5);
    expect(table.cellsAt(null, 1, { ignoreMerged: true }).length).toStrictEqual(6);
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
    for (const row of table.iterRows({ repeatMultiRowCells: true })) {
      expect(row.nCells).toStrictEqual(expectedCellsPerRow[nRows]);
      ++nRows;
    }
    expect(nRows).toStrictEqual(table.nRows);
    expect(nRows).toStrictEqual(6);
  });

  it("iterates table rows ignoring merged cells and repeating spanned cells", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const expectedCellsPerRow = [5, 5, 5, 5, 5, 5];

    const table = doc.pageNumber(1).tableAtIndex(0);
    const tableRows = table.listRows();
    expect(tableRows.length).toStrictEqual(table.nRows);
    let nRows = 0;
    for (const row of table.iterRows({ ignoreMerged: true, repeatMultiRowCells: true })) {
      expect(row.nCells).toStrictEqual(expectedCellsPerRow[nRows]);
      ++nRows;
    }
    expect(nRows).toStrictEqual(table.nRows);
    expect(nRows).toStrictEqual(6);
  });

  it("lists table rows", () => {
    const doc = new TextractDocument(testResponseJson);

    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.listRows({ repeatMultiRowCells: true }).length).toStrictEqual(table.nRows);
  });

  it("navigates table row cells", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).tableAtIndex(0);
    const expectedRowLengths = [5, 2, 5, 4, 5, 2];
    let nCellsTotal = 0;
    let nRows = 0;
    let targetCellFound = false;
    for (const row of table.iterRows({ repeatMultiRowCells: false })) {
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
        const cellContent = cell.listContent();
        expect(cellContent.length).toStrictEqual(cell.nContentItems);
        const cellContentByIteration = [...cell.iterContent()];
        expect(cellContent.length).toStrictEqual(cellContentByIteration.length);
        cellContentByIteration.forEach((item, ixItem) => {
          expect(item).toBe(cellContent[ixItem]);
        });
        if (nRows === 4 && nCells === 1) {
          expect(cell.text).toMatch("Payment - Utility");
          expect(
            cellContent
              .filter((c) => c.blockType === ApiBlockType.Word)
              .map((w) => (w as Word).text)
              .join(" "),
          ).toMatch("Payment - Utility");
          targetCellFound = true;
        }
      }
      expect(nCells).toStrictEqual(row.nCells);
    }
    expect(nCellsTotal).toStrictEqual(expectedRowLengths.reduce((acc, next) => acc + next, 0));
    expect(targetCellFound).toStrictEqual(true);
  });

  it("aggregates OCR confidence of cell content", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const table = page.tableAtIndex(0);
    const firstCell = table.cellAt(1, 1);

    expect(firstCell).toBeTruthy();
    const cellContentRaw = firstCell?.listContent();
    expect(cellContentRaw?.length).toBeGreaterThan(1); // (to validate different agg methods)
    const cellContent = cellContentRaw || []; // Give us nice typings for the rest of this suite

    const minOcrConf = firstCell?.getOcrConfidence(AggregationMethod.Min);
    expect(minOcrConf).toStrictEqual(Math.min(...cellContent.map((c) => c.confidence)));
    const maxOcrConf = firstCell?.getOcrConfidence(AggregationMethod.Max);
    expect(maxOcrConf).toStrictEqual(Math.max(...cellContent.map((c) => c.confidence)));

    const avgOcrConf = firstCell?.getOcrConfidence();
    expect(firstCell?.getOcrConfidence(AggregationMethod.Mean)).toStrictEqual(avgOcrConf);
    expect(avgOcrConf).toStrictEqual(
      cellContent.reduce((acc, next) => acc + next.confidence, 0) / cellContent.length,
    );
  });

  it("aggregates OCR confidence of row content", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const table = page.tableAtIndex(0);
    const firstRow = table.rowAt(1);
    const firstRowCells = firstRow.listCells();

    // List the OCR confidence scores of all content in this row:
    let contentConfs: number[] = [];
    firstRowCells.forEach((cell) => {
      contentConfs = contentConfs.concat(cell.listContent().map((c) => c.confidence));
    });

    // Check the row contains multiple content to ensure the different aggs are well tested:
    expect(contentConfs.length).toBeGreaterThan(1);

    // Check the OCR confidences scores behave as expected:
    expect(firstRow.getOcrConfidence(AggregationMethod.Max)).toStrictEqual(Math.max(...contentConfs));
    expect(firstRow.getOcrConfidence(AggregationMethod.Min)).toStrictEqual(Math.min(...contentConfs));
    expect(firstRow.getOcrConfidence()).toStrictEqual(
      contentConfs.reduce((acc, next) => acc + next, 0) / contentConfs.length,
    );
  });

  it("aggregates structure confidence of row cells", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const table = page.tableAtIndex(0);
    const firstRow = table.rowAt(1);
    const cellConfs: number[] = firstRow.listCells().map((c) => c.confidence);

    // Check the row contains multiple content to ensure the different aggs are well tested:
    expect(cellConfs.length).toBeGreaterThan(1);

    // Check the aggregate structure confidences scores behave as expected:
    expect(firstRow.getConfidence(AggregationMethod.Max)).toStrictEqual(Math.max(...cellConfs));
    expect(firstRow.getConfidence(AggregationMethod.Min)).toStrictEqual(Math.min(...cellConfs));
    expect(firstRow.getConfidence()).toStrictEqual(
      cellConfs.reduce((acc, next) => acc + next, 0) / cellConfs.length,
    );
  });

  it("aggregates OCR confidence of table content", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const table = page.tableAtIndex(0);
    const cells = ([] as Array<CellGeneric<Page> | MergedCellGeneric<Page>>).concat(
      ...table.listRows().map((row) => row.listCells()),
    );

    // List the OCR confidence scores of all content in this row:
    let contentConfs: number[] = [];
    cells.forEach((cell) => {
      contentConfs = contentConfs.concat(cell.listContent().map((c) => c.confidence));
    });

    // Check the table contains multiple content to ensure the different aggs are well tested:
    expect(contentConfs.length).toBeGreaterThan(1);

    // Check the OCR confidences scores behave as expected:
    expect(table.getOcrConfidence(AggregationMethod.Max)).toStrictEqual(Math.max(...contentConfs));
    expect(table.getOcrConfidence(AggregationMethod.Min)).toStrictEqual(Math.min(...contentConfs));
    expect(table.getOcrConfidence()).toStrictEqual(
      contentConfs.reduce((acc, next) => acc + next, 0) / contentConfs.length,
    );
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
      table
        .rowAt(1)
        .listCells()
        .filter((c) => c.hasEntityTypes(ApiTableCellEntityType.ColumnHeader)).length,
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
    expect(
      firstCell?.hasEntityTypes([ApiTableCellEntityType.ColumnHeader, ApiTableCellEntityType.Footer]),
    ).toStrictEqual(true);
    expect(
      firstCell?.hasEntityTypes([ApiTableCellEntityType.Summary, ApiTableCellEntityType.Footer]),
    ).toStrictEqual(false);
  });

  it("navigates table titles", () => {
    const doc = new TextractDocument(testTitleFootersJson);
    const table = doc.pageNumber(1).tableAtIndex(0);
    const tableTitles = table.listTitles();
    expect(tableTitles.length).toBeGreaterThan(0);
    let ixTitle = 0;
    for (const title of table.iterTitles()) {
      expect(title).toBe(tableTitles[ixTitle]);
      ++ixTitle;
    }
    expect(ixTitle).toStrictEqual(tableTitles.length);
    expect(table.firstTitle).toBe(tableTitles[0]);

    // Perform as expected when no titles present:
    const noTitlesDoc = new TextractDocument(testTableMergedCellsJson);
    const noTitlesTable = noTitlesDoc.pageNumber(1).tableAtIndex(0);
    expect(noTitlesTable.listTitles().length).toStrictEqual(0);
    expect(noTitlesTable.firstTitle).toBeUndefined();
  });

  it("navigates table footers", () => {
    const doc = new TextractDocument(testTitleFootersJson);
    const table = doc.pageNumber(1).tableAtIndex(0);
    const tableFooters = table.listFooters();
    expect(tableFooters.length).toBeGreaterThan(0);
    let ixFooter = 0;
    for (const footer of table.iterFooters()) {
      expect(footer).toBe(tableFooters[ixFooter]);
      ++ixFooter;
    }
    expect(ixFooter).toStrictEqual(tableFooters.length);
    expect(table.firstFooter).toBe(tableFooters[0]);

    // Perform as expected when no footers present:
    const noFootersDoc = new TextractDocument(testResponseJson);
    const noFootersTable = noFootersDoc.pageNumber(1).tableAtIndex(0);
    expect(noFootersTable.listFooters().length).toStrictEqual(0);
    expect(noFootersTable.firstFooter).toBeUndefined();
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

  it("extracts text content from tables", () => {
    const doc = new TextractDocument(testTableMergedCellsJson);
    const table = doc.pageNumber(1).tableAtIndex(0);
    expect(table.cellAt(6, 1)?.text).toStrictEqual("Ending Balance");
    expect(table.cellAt(6, 4)?.text).toStrictEqual("Ending Balance");
    expect(table.cellAt(6, 5)?.text).toStrictEqual("10,960");
    expect(table.rowAt(6).text).toStrictEqual("Ending Balance\t10,960");
    expect(table.text).toContain("Ending Balance\t10,960");
  });

  it("stringifies tables to semantic HTML", () => {
    const docTableNoCaption = new TextractDocument(testTableMergedCellsJson);
    const tableNoCaption = docTableNoCaption.pageNumber(1).tableAtIndex(0);
    expect(tableNoCaption.html()).toStrictEqual(REFERENCE_TABLE_NO_CAPTION_HTML);

    const docTableWithHeader = new TextractDocument(testResponseJson);
    const tableWithHeader = docTableWithHeader.pageNumber(1).tableAtIndex(0);
    expect(tableWithHeader.html()).toStrictEqual(REFERENCE_TABLE_WITH_HEADER_HTML);

    // TODO: Ideally could add tests for footer-only and having both?
  });

  it("mutates confidence fields", () => {
    const NEW_CONFIDENCE = 42.42;
    const response: ApiAnalyzeDocumentResponse = JSON.parse(JSON.stringify(testResponseJson));
    const doc = new TextractDocument(response);
    const table = doc.pageNumber(1).tableAtIndex(0);
    const tableBlock = response.Blocks.find((b) => b.Id === table.id) as ApiTableBlock;
    expect(table.confidence).not.toEqual(NEW_CONFIDENCE);
    table.confidence = NEW_CONFIDENCE;
    expect(table.confidence).toEqual(NEW_CONFIDENCE);
    expect(tableBlock.Confidence).toStrictEqual(NEW_CONFIDENCE);

    const cell = table.cellAt(1, 1);
    if (typeof cell === "undefined") throw new Error("Expected table cell not found");
    const cellBlock = response.Blocks.find((b) => b.Id === cell.id) as ApiCellBlock;
    expect(cell.confidence).not.toEqual(NEW_CONFIDENCE);
    cell.confidence = NEW_CONFIDENCE;
    expect(cell.confidence).toEqual(NEW_CONFIDENCE);
    expect(cellBlock.Confidence).toStrictEqual(NEW_CONFIDENCE);
  });
});
