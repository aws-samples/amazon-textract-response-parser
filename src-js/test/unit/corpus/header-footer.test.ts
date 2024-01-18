/**
 * Tests for evaluating the header and footer segmentation APIs against a corpus of example documents.
 *
 * You can use this template to run your own tests to tune the getLinesByLayoutArea model for your use case
 * as follows:
 *
 * 1. Extract your sample documents and put the Textract JSON result files in the test/data/corpus folder
 * 2. For each sample document, create a test spec (as shown below) defining what lines you expect to see
 *    pulled out as header and footer.
 * 3. Run the tests and note which files fail with the default configuration.
 * 4. Adjust the getLinesByLayoutArea({}) configuration params to optimize performance on your test set.
 *
 * The TRP's getLinesByLayoutArea functions are based on heuristics only and can't achieve perfect results on
 * every use case - so if you're struggling to tune parameters for your own documents, you may find it easier
 * to write custom logic!
 */
import { ApiResponsePages } from "../../../src/api-models/response";
import { HeaderFooterSegmentModelParams, Line, TextractDocument } from "../../../src/document";

interface HeaderFooterTest {
  textractJsonFile: string;
  pages: Array<{
    pageNum: number;
    headerLinesLike: string[];
    footerLinesLike: string[];
  }>;
}

// Define your tests in a .ts file in the corpus folder alongside your documents:
// import { HEADER_FOOTER_TESTS } from "../../data/corpus/header-footer-spec";
// OR here inline:
const HEADER_FOOTER_TESTS: HeaderFooterTest[] = [
  // {
  //   textractJsonFile: "../../data/corpus/...textract.json",
  //   pages: [
  //     {
  //       // Specify whichever pages you want to test for each document:
  //       pageNum: 1,
  //       // Case-insensitive expected line texts for headers and footers:
  //       headerLinesLike: ["Header line 1", "header line 2?"],
  //       footerLinesLike: ["Footer?"],
  //     },
  //     {
  //       // ...And etc...
  //       pageNum: 5,
  //       headerLinesLike: [],
  //       footerLinesLike: [],
  //     },
  //   ],
  // },
];

const HEADER_CONFIG: HeaderFooterSegmentModelParams = {
  // Config overrides here for headers if you want:
  // maxMargin: 0.2,
  // minGap: 1.5,
};
const FOOTER_CONFIG: HeaderFooterSegmentModelParams = {
  // Config overrides here for footers if you want:
  // maxMargin: 0.2,
  // minGap: 1.5,
};

export interface PageHeaderFooterTestSpec {
  pageNum: number;
  headerLinesLike: string[];
  footerLinesLike: string[];
}

function checkLinesAreLike(
  lines: Line[],
  expected: string[],
  filename: string,
  pageNum: number,
  lineType: string
) {
  const nExpected = expected.length;
  if (lines.length !== nExpected) {
    throw new Error(
      `${filename} page ${pageNum} returned ${lines.length} ${lineType} LINEs. Expected ${nExpected}`
    );
  }
  const remainingExpectedLines = expected.map((e) => e.toLocaleLowerCase());
  for (const line of lines) {
    const lineTextLower = line.text.toLocaleLowerCase();
    const foundTextIx = remainingExpectedLines.findIndex(
      (expected) => lineTextLower.indexOf(expected.toLocaleLowerCase()) >= 0
    );
    if (foundTextIx < 0) {
      throw new Error(
        `${filename} page ${pageNum} returned unexpected ${lineType} line '${line.text}' not matching spec`
      );
    }
    remainingExpectedLines.splice(foundTextIx, 1);
  }
  if (remainingExpectedLines.length) {
    throw new Error(
      `${filename} page ${pageNum} expected ${lineType} lines were not present:\n${remainingExpectedLines}`
    );
  }
}

function checkHeaderFooters(filename: string, headerFooterSpec: PageHeaderFooterTestSpec[]) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const textractJson: ApiResponsePages = require(filename);
  const doc = new TextractDocument(textractJson);

  for (const pageSpec of headerFooterSpec) {
    expect(doc.nPages).toBeGreaterThanOrEqual(pageSpec.pageNum);
    const page = doc.pageNumber(pageSpec.pageNum);

    if (pageSpec.headerLinesLike) {
      checkLinesAreLike(
        page.getHeaderLines(HEADER_CONFIG),
        pageSpec.headerLinesLike,
        filename,
        pageSpec.pageNum,
        "header"
      );
    }

    if (pageSpec.footerLinesLike) {
      checkLinesAreLike(
        page.getFooterLines(FOOTER_CONFIG),
        pageSpec.footerLinesLike,
        filename,
        pageSpec.pageNum,
        "footer"
      );
    }
  }
}

describe("Header/footer corpus tests", () => {
  it("dummy test to prevent errors when corpus is empty", () => undefined);

  HEADER_FOOTER_TESTS.forEach((headerFooterTest, ixTest) => {
    it(`reads test doc ${ixTest + 1} header and footer: ${headerFooterTest.textractJsonFile}`, () => {
      checkHeaderFooters(headerFooterTest.textractJsonFile, headerFooterTest.pages);
    });
  });
});
