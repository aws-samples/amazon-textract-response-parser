/**
 * Tests for evaluating the '*inReadingOrder' APIs against a corpus of example documents.
 *
 * You can use this template to run your own tests to tune the getLineClustersInReadingOrder model for your
 * use case as follows:
 *
 * 1. Extract your sample documents and put the Textract JSON result files in the test/data/corpus folder
 * 2. For each sample document, create a test spec (as shown below) defining which paragraphs you expect to
 *    see by specifying text contained within the first LINE from each one. You may find the diagnostic
 *    script `npm run reading-order-diagnostic` helps by pulling out the text with the default settings.
 * 3. Run the tests. Note that files where your specified lines come out in the wrong order are marked as
 *    failures, while extra paragraph breaks (or missing paragraph breaks) are logged as warnings.
 * 4. Adjust the inReadingOrder({}) params to optimize performance on your test set, perhaps diving into the
 *    detailed outputs available in the test function below.
 *
 * The TRP's inReadingOrder functions are based on local heuristics only and can't achieve perfect results on
 * every use case - so if you're struggling to tune parameters for your own documents, you may find it easier
 * to write custom logic!
 */
import { ApiResponsePages } from "../../src/api-models";
import { TextractDocument } from "../../src/document";

// Define your tests in a .ts file in the corpus folder alongside your documents:
//import { READING_ORDER_TESTS } from "../data/corpus/reading-order-spec";
// OR here inline:
const READING_ORDER_TESTS = [
  // {
  //   textractJsonFile: "../data/corpus/...textract.json",
  //   sequence: [
  //     // List of (case-insensitive) expected paragraph first line texts by page.
  //     // The code will check if your text is *contained* within the LINE from Textract.
  //     [
  //       "Friends, Romans,", // Page 1 paragraph 1 expected first line includes
  //       "wondering why I", // Pag 1 paragraph 2 expected first line includes
  //     ],
  //     [
  //       "can say for what reason", // Page 2 paragraph 1 expected first line includes
  //     ],
  //   ],
  // },
];

function checkReadingOrder(filename: string, expectedDocReadingOrder: string[][]) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const textractJson: ApiResponsePages = require(filename);
  const doc = new TextractDocument(textractJson);

  expectedDocReadingOrder = expectedDocReadingOrder.map((page) =>
    page.map((para) => para.toLocaleLowerCase())
  );

  return expectedDocReadingOrder.map((expectedPageReadingOrder, ixPage) => {
    const readingOrder = doc.pageNumber(ixPage + 1).getLineClustersInReadingOrder(
      // Can customize the parameters here if wanted:
      {
        // colHOverlapThresh: 0.8,
        // colHMultilineUnionThresh: 0.7,
        // paraVDistTol: 0.5,
        // paraLineHeightTol: 0.5,
        // paraIndentThresh: 1.0,
      }
    );
    const pageParasLower = readingOrder.map((para) => para.map((line) => line.text.toLocaleLowerCase()));

    let ixTestPara = 0;
    const detectedOrder: number[] = [];
    const extraParas: { after: number }[] = [];
    const missingBreaks: { after: number }[] = [];
    for (let ixPara = 0; ixPara < readingOrder.length; ++ixPara) {
      const firstLine = pageParasLower[ixPara][0];
      if (firstLine.indexOf(expectedPageReadingOrder[ixTestPara]) >= 0) {
        detectedOrder.push(ixTestPara);
        ++ixTestPara;
      } else {
        extraParas.push({ after: ixTestPara - 1 });
      }
      for (let ixLine = 1; ixLine < pageParasLower[ixPara].length; ++ixLine) {
        const line = pageParasLower[ixPara][ixLine];
        if (line.indexOf(expectedPageReadingOrder[ixTestPara]) >= 0) {
          detectedOrder.push(ixTestPara);
          missingBreaks.push({ after: ixTestPara - 1 });
          ++ixTestPara;
        }
      }
    }
    const readingOrderPassed = ixTestPara === expectedPageReadingOrder.length;
    return {
      readingOrderPassed,
      readingOrderFailedAfterPara: readingOrderPassed ? null : ixTestPara,
      extraParas,
      missingBreaks,
    };
  });
}

function expectReadingOrderSuccessful(result) {
  const pagesFailed = result
    .map((pageResult, ixPage) =>
      pageResult.readingOrderPassed
        ? ""
        : `Page ${ixPage + 1} after test para index ${pageResult.readingOrderFailedAfterPara}`
    )
    .filter((m: string) => m);
  const msg = pagesFailed.length
    ? `Reading order mismatches on ${pagesFailed.length} pages:\n - ${pagesFailed.join("\n - ")}`
    : "All pages matched reading order spec";
  expect(msg).toStrictEqual("All pages matched reading order spec");
}

describe("Reading order corpus tests", () => {
  READING_ORDER_TESTS.forEach((readingOrderTest, ixTest) => {
    it(`reads test doc ${ixTest + 1} in correct order: ${readingOrderTest.textractJsonFile}`, () => {
      const result = checkReadingOrder(readingOrderTest.textractJsonFile, readingOrderTest.sequence);

      expectReadingOrderSuccessful(result);
      const nMissingBreaks = result.reduce((acc, next) => acc + next.missingBreaks.length, 0);
      const nExtraParas = result.reduce((acc, next) => acc + next.extraParas.length, 0);
      if (nMissingBreaks > 0 || nExtraParas > 0) {
        console.warn(
          `Test doc ${
            ixTest + 1
          } got ${nMissingBreaks} missing para breaks and ${nExtraParas} extra paragraphs`
        );
      }
    });
  });

  it("segments paragraphs okay", () => {
    const docResults = READING_ORDER_TESTS.map((test) =>
      checkReadingOrder(test.textractJsonFile, test.sequence)
    );
    const nMissingBreaks = docResults.reduce(
      (acc, docResult) => acc + docResult.reduce((acc, next) => acc + next.missingBreaks.length, 0),
      0
    );
    const nExtraParas = docResults.reduce(
      (acc, docResult) => acc + docResult.reduce((acc, next) => acc + next.extraParas.length, 0),
      0
    );
    if (nMissingBreaks > 0 || nExtraParas > 0) {
      console.warn(`Overall got ${nMissingBreaks} missing para breaks and ${nExtraParas} extra paragraphs`);
    }
    // We don't actually have any expect()s here because appropriate thresholds will depend on your corpus.
  });
});
