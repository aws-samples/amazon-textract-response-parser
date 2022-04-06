import { ApiBlockType, ApiResponsePage, ApiResponsePages } from "../../src/api-models";
import { Line, TextractDocument } from "../../src/document";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testFailedJson: ApiResponsePage = require("../data/test-failed-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testInProgressJson: ApiResponsePage = require("../data/test-inprogress-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testResponseJson: ApiResponsePage = require("../data/test-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testMultiColumnJson: ApiResponsePage = require("../data/test-multicol-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testMultiColumnJson2: ApiResponsePage = require("../data/test-multicol-response-2.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testHeaderFooterJson: ApiResponsePage = require("../data/test-twocol-header-footer-response.json");

const EXPECTED_MULTILINE_SEQ_LOWER = [
  "multi-column test document",
  "a sample document with",
  "this section has two columns",
  "the left column contains",
  "a horizontally separate right",
  "this column has approximately",
  "correct processing",
  "a final footer",
];

const EXPECTED_MULTILINE_SEQ_2_LOWER = [
  "heading of the page",
  "section id",
  "[enter]",
  "two columns, both alike",
  "from ancient grudge break",
  "a glooming peace",
  "go hence with caution",
  "for never was a heuristic",
  "in reading order",
  "the end",
  "page 1",
];

/**
 * We want to test a couple of examples for reading order, so will pull this out as a function
 */
function checkMultiColReadingOrder(
  docJson: ApiResponsePage | ApiResponsePages,
  expectedSeq: string[],
  pageNum = 1
) {
  const doc = new TextractDocument(docJson);

  const readingOrder = doc.pageNumber(pageNum).getLineClustersInReadingOrder();
  // May want to switch to this instead to help debug if you see failures:
  // const clustered = doc.pageNumber(pageNum)._getLineClustersByColumn();
  // console.warn(clustered.map((col) => col.map((p) => `${p[0].text}... (${p.length} lines)`)));
  // const readingOrder = [].concat(...clustered);

  expect(readingOrder.length).not.toBeLessThan(expectedSeq.length);

  const sortedLinesTextLower = ([] as Line[]).concat(...readingOrder).map((l) => l.text.toLocaleLowerCase());
  expect(sortedLinesTextLower.length).not.toBeLessThan(expectedSeq.length);
  let ixTest = 0;
  sortedLinesTextLower.forEach((lineText) => {
    const matchIx = expectedSeq.findIndex((seq) => lineText.indexOf(seq) >= 0);
    if (matchIx >= 0) {
      // We compare the strings first here to make failed assertions a bit more meaningful:
      expect(expectedSeq[matchIx]).toStrictEqual(expectedSeq[ixTest]);
      expect(matchIx).toStrictEqual(ixTest);
      ++ixTest;
    }
  });
  expect(ixTest).toStrictEqual(expectedSeq.length);
}

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

  it("loads and navigates pages", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.nPages).toStrictEqual(1);
    const iterPages = [...doc.iterPages()];
    const pageList = doc.listPages();
    const firstPage = doc.pageNumber(1);
    expect(iterPages.length).toStrictEqual(doc.nPages);
    expect(pageList.length).toStrictEqual(doc.nPages);
    expect(firstPage).toBe(iterPages[0]);
    for (let ix = 0; ix < doc.nPages; ++ix) {
      expect(iterPages[ix]).toBe(pageList[ix]);
    }

    expect(firstPage.blockType).toStrictEqual(ApiBlockType.Page);
    expect(firstPage.parentDocument).toBe(doc);
    expect(firstPage.geometry.parentObject).toBe(firstPage);
  });

  it("throws errors on out-of-bounds pages", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(() => doc.pageNumber(0)).toThrow(/must be between 1 and/);
    expect(() => doc.pageNumber(doc.nPages + 1)).toThrow(/must be between 1 and/);
  });

  it("loads and navigates lines", () => {
    const doc = new TextractDocument(testResponseJson);
    const firstPage = doc.pageNumber(1);
    expect(firstPage.nLines).toStrictEqual(31);

    const iterLines = [...firstPage.iterLines()];
    const lineList = firstPage.listLines();
    const firstLine = firstPage.lineAtIndex(0);
    expect(iterLines.length).toStrictEqual(firstPage.nLines);
    expect(lineList.length).toStrictEqual(firstPage.nLines);
    expect(firstLine).toBe(iterLines[0]);
    for (let ix = 0; ix < firstPage.nLines; ++ix) {
      expect(iterLines[ix]).toBe(lineList[ix]);
    }

    expect(firstLine.blockType).toStrictEqual(ApiBlockType.Line);
    expect(firstLine.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(firstLine.confidence).toBeLessThanOrEqual(100);
    expect(firstLine.parentPage).toBe(firstPage);
    expect(firstLine.geometry.parentObject).toBe(firstLine);
    expect(firstLine.text).toMatch("Employment Application");
  });

  it("throws errors on out-of-bounds lines", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    expect(() => page.lineAtIndex(-1)).toThrow(/Line index/);
    expect(() => page.lineAtIndex(page.nLines)).toThrow(/Line index/);
  });

  it("loads and navigates line words", () => {
    const doc = new TextractDocument(testResponseJson);
    const firstPage = doc.pageNumber(1);
    const firstLine = firstPage.lineAtIndex(0);
    expect(firstLine.nWords).toStrictEqual(2);

    const iterWords = [...firstLine.iterWords()];
    const wordList = firstLine.listWords();
    const firstWord = firstLine.wordAtIndex(0);
    expect(iterWords.length).toStrictEqual(firstLine.nWords);
    expect(wordList.length).toStrictEqual(firstLine.nWords);
    expect(firstWord).toBe(iterWords[0]);
    for (let ix = 0; ix < firstLine.nWords; ++ix) {
      expect(iterWords[ix]).toBe(wordList[ix]);
    }

    // (no parent prop on Word)
    expect(firstWord.blockType).toStrictEqual(ApiBlockType.Word);
    expect(firstWord.geometry.parentObject).toBe(firstWord);
    expect(firstPage.listLines().reduce((acc, next) => acc + next.listWords().length, 0)).toStrictEqual(71);
    expect(firstWord.text).toMatch("Employment");
    expect(firstWord.str()).toStrictEqual(firstWord.text);
  });

  it("throws errors on out-of-bounds line words", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const line = page.lineAtIndex(0);
    expect(() => line.wordAtIndex(-1)).toThrow(/Word index/);
    expect(() => line.wordAtIndex(line.nWords)).toThrow(/Word index/);
  });

  it("loads page, line and word bounding boxes", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const line = page.lineAtIndex(1);
    const word = line.wordAtIndex(0);

    expect(word.geometry.boundingBox.parentGeometry?.parentObject).toBe(word);
    expect(line.geometry.boundingBox.parentGeometry?.parentObject?.parentPage).toBe(page);

    expect(page.geometry.boundingBox.top).toBeLessThan(line.geometry.boundingBox.top);
    expect(page.geometry.boundingBox.bottom).toBeGreaterThan(line.geometry.boundingBox.bottom);
    expect(page.geometry.boundingBox.left).toBeLessThan(line.geometry.boundingBox.left);
    expect(page.geometry.boundingBox.right).toBeGreaterThan(line.geometry.boundingBox.right);

    expect(line.geometry.boundingBox.top).toBeLessThanOrEqual(word.geometry.boundingBox.top);
    expect(line.geometry.boundingBox.bottom).toBeGreaterThanOrEqual(word.geometry.boundingBox.bottom);
    expect(line.geometry.boundingBox.left).toStrictEqual(word.geometry.boundingBox.left);
    expect(line.geometry.boundingBox.right).toBeGreaterThan(word.geometry.boundingBox.right);
  });

  it("exposes raw dicts with traversal up and down the tree", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    // Doc to LINE and back again:
    expect(page.lineAtIndex(0).parentPage.parentDocument.dict).toBe(doc.dict);
    // Word to BBox/Polygon and back again:
    const aWord = doc.pageNumber(1).lineAtIndex(0).wordAtIndex(0);
    expect(aWord.geometry.boundingBox.parentGeometry?.parentObject?.dict).toBe(aWord.dict);
    expect(aWord.geometry.polygon[0].parentGeometry?.parentObject?.dict).toBe(aWord.dict);
  });

  it("sorts lines correctly for multi-column documents (case 1)", () => {
    checkMultiColReadingOrder(testMultiColumnJson, EXPECTED_MULTILINE_SEQ_LOWER);
  });

  it("sorts lines correctly for multi-column documents (case 2)", () => {
    checkMultiColReadingOrder(testMultiColumnJson2, EXPECTED_MULTILINE_SEQ_2_LOWER);
  });

  it("outputs text correctly for multi-column documents", () => {
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

  it("Extracts header and footer content", () => {
    const page = new TextractDocument(testHeaderFooterJson).pageNumber(1);

    const headerLines = page.getHeaderLines();
    expect(headerLines.length).toStrictEqual(5);
    const footerLines = page.getFooterLines();
    expect(footerLines.length).toStrictEqual(4);
  });

  it("Restricts header and footer content with strict configuration", () => {
    const page = new TextractDocument(testHeaderFooterJson).pageNumber(1);

    // Require bigger gap between header and content than exists:
    const headerLines = page.getHeaderLines({ minGap: 4 });
    expect(headerLines.length).toStrictEqual(0);
    // Footer has a big gap on this page, so same param should be fine:
    const footerLines1 = page.getFooterLines({ minGap: 4 });
    expect(footerLines1.length).toStrictEqual(4);
    // But should still be able to restrict by narrowing the footer window too short:
    const footerLines2 = page.getFooterLines({ maxMargin: 0.02 });
    expect(footerLines2.length).toStrictEqual(0);
  });

  it("Segments header, content, and footer sections", () => {
    const page = new TextractDocument(testHeaderFooterJson).pageNumber(1);

    const segmented = page.getLinesByLayoutArea(false);
    expect(segmented.header.length).toStrictEqual(5);
    expect(segmented.footer.length).toStrictEqual(4);
    expect(segmented.content.length).toStrictEqual(page.listLines().length - (5 + 4));
  });

  it("Segments header, content, and footer sections in reading order", () => {
    const page = new TextractDocument(testHeaderFooterJson).pageNumber(1);

    const readingOrder = ([] as Line[]).concat(...page.getLineClustersInReadingOrder());
    const tmpfirst = readingOrder.findIndex((line) => line.text == "With multiple lines");
    const tmpsecond = readingOrder.findIndex((line) => line.text == "right-aligned header");
    expect(tmpfirst).toBeGreaterThanOrEqual(0);
    expect(tmpsecond).toBeGreaterThanOrEqual(0);
    expect(tmpsecond).toBeGreaterThan(tmpfirst);

    const segmented = page.getLinesByLayoutArea(true);
    const EXPECTED_HEADER_LINES = [
      "Left-aligned header",
      "With multiple lines",
      // (Right comes in first because it starts higher up than center)
      "right-aligned header",
      "with multiple lines",
      "CENTER-ALIGNED HEADER",
    ];
    expect(segmented.header.length).toStrictEqual(EXPECTED_HEADER_LINES.length);
    segmented.header.forEach((line, ix) => {
      expect(line.text).toMatch(EXPECTED_HEADER_LINES[ix]);
    });

    const EXPECTED_FOOTER_LINES = ["Left-aligned footer", "Multi-line centered", "footer content", "Page"];
    expect(segmented.footer.length).toStrictEqual(EXPECTED_FOOTER_LINES.length);
    segmented.footer.forEach((line, ix) => {
      expect(line.text).toMatch(EXPECTED_FOOTER_LINES[ix]);
    });

    const ixLeftColBottomLine = segmented.content.findIndex((l) =>
      l.text.startsWith("ML model-based approaches may be")
    );
    if (ixLeftColBottomLine < 0) {
      throw new Error("Couldn't find multi-column left col test line in segmented content");
    }
    const ixRightColMidLine = segmented.content.findIndex((l) =>
      l.text.startsWith("This means it cannot solve")
    );
    if (ixRightColMidLine < 0) {
      throw new Error("Couldn't find multi-column right col test line in segmented content");
    }

    expect(ixRightColMidLine).toBeGreaterThan(ixLeftColBottomLine);
  });

  it("detects 0 orientation for perfectly straight pages", () => {
    const doc = new TextractDocument(testMultiColumnJson);

    for (const page of doc.iterPages()) {
      expect(page.getModalWordOrientationDegrees()).toStrictEqual(0);
    }
  });
});
