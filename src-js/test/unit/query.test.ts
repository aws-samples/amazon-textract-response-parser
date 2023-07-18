import {
  ApiAnalyzeDocumentResponse,
  ApiBlockType,
  ApiQueryBlock,
  ApiQueryResultBlock,
  ApiRelationshipType,
  ApiResponsePage,
} from "../../src/api-models";
import { QueryInstance, QueryResult, TextractDocument } from "../../src/document";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testResponseJson: ApiResponsePage = require("../data/test-query-response.json");

describe("QueryCollection", () => {
  it("loads and navigates queries at page level", () => {
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    expect(page.queries.nQueries).toStrictEqual(4);
    expect(page.queries.parentPage).toBe(page);

    const queryList = page.queries.listQueries();
    expect(queryList.length).toStrictEqual(page.queries.nQueries);
    const iterQueries = [...page.queries.iterQueries()];
    expect(iterQueries.length).toStrictEqual(page.queries.nQueries);
    for (let ix = 0; ix < page.queries.nQueries; ++ix) {
      expect(iterQueries[ix]).toBe(queryList[ix]);
    }

    const query = queryList[0];
    expect(query.parentPage).toBe(page);

    const topResult = query.topResult as QueryResult;
    expect(topResult).toBeTruthy();
    expect(topResult.parentPage).toBe(page);
    expect(topResult.parentQuery).toBe(query);
    expect(topResult.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(topResult.confidence).toBeLessThanOrEqual(100);
  });

  it("fetches page queries by exact alias", () => {
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    expect(page.queries.getQueryByAlias("doesnotexist")).toBeUndefined();

    // Cast type to keep IDE happy because it can't tell the following expect() will error on undef
    const query = page.queries.getQueryByAlias("name") as QueryInstance;
    expect(query).toBeTruthy();

    expect(query.alias).toStrictEqual("name");
    expect(query.text).toStrictEqual("What is the patient name?");
    expect(query.nResults).toStrictEqual(1);

    // Cast type to keep IDE happy because it can't tell the following expect() will error on undef
    const topResult = query.topResult as QueryResult;
    expect(topResult).toBeTruthy();
    expect(topResult.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(topResult.confidence).toBeLessThanOrEqual(100);
    expect(topResult.geometry).toBeTruthy(); // Non-interpreted answer
    expect(topResult.geometry?.parentObject).toBe(topResult);
    expect(topResult.text).toStrictEqual("Mary Major");
  });

  it("searches page queries by alias", () => {
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    expect(page.queries.searchQueriesByAlias("doesnotexist")).toStrictEqual([]);

    const queries = page.queries.searchQueriesByAlias("NAM");
    const query = page.queries.getQueryByAlias("name") as QueryInstance;
    expect(queries.length).toStrictEqual(1);
    expect(queries).toContain(query);
  });

  it("fetches page queries by exact query text", () => {
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    expect(page.queries.getQueryByQuestion("doesnotexist")).toBeUndefined();

    // Cast type to keep IDE happy because it can't tell the following expect() will error on undef
    const query = page.queries.getQueryByQuestion("What is the lot number of the 1st dose?") as QueryInstance;
    expect(query).toBeTruthy();

    expect(query.alias).toStrictEqual("lot_number");
    expect(query.text).toStrictEqual("What is the lot number of the 1st dose?");
    expect(query.nResults).toStrictEqual(1);

    // Cast type to keep IDE happy because it can't tell the following expect() will error on undef
    const topResult = query.topResult as QueryResult;
    expect(topResult).toBeTruthy();
    expect(topResult.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(topResult.confidence).toBeLessThanOrEqual(100);
    expect(topResult.geometry).toBeTruthy(); // Non-interpreted answer
    expect(topResult.geometry?.parentObject).toBe(topResult);
    expect(topResult.text).toStrictEqual("AA1234");
  });

  it("searches page queries by query text", () => {
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    expect(page.queries.searchQueriesByQuestion("doesnotexist")).toStrictEqual([]);

    const queries = page.queries.searchQueriesByQuestion("what");
    expect(queries.length).toStrictEqual(3);
    const q1 = page.queries.getQueryByAlias("lot_number") as QueryInstance;
    const q2 = page.queries.getQueryByAlias("name") as QueryInstance;
    expect(queries).toContain(q1);
    expect(queries).toContain(q2);
  });

  it("doesn't retrieve queries by empty alias/text", () => {
    // (Important to avoid unexpected behaviour if search term is unexpectedly empty and doc
    // contains un-aliased queries)
    const page = new TextractDocument(testResponseJson).pageNumber(1);

    const noAliasQueries = page.queries.listQueries().filter((q) => typeof q.alias === "undefined");
    expect(noAliasQueries.length).toBeGreaterThan(0); // Test doc should contain some un-aliased queries
    expect(page.queries.getQueryByAlias(undefined as unknown as string)).toBeUndefined();
    expect(page.queries.getQueryByAlias("")).toBeUndefined();
    expect(page.queries.searchQueriesByAlias(undefined as unknown as string)).toStrictEqual([]);
    expect(page.queries.searchQueriesByAlias("")).toStrictEqual([]);

    // Test doc doesn't actually contain any empty-text queries
    expect(page.queries.getQueryByQuestion(undefined as unknown as string)).toBeUndefined();
    expect(page.queries.getQueryByQuestion("")).toBeUndefined();
    expect(page.queries.searchQueriesByQuestion(undefined as unknown as string)).toStrictEqual([]);
    expect(page.queries.searchQueriesByQuestion("")).toStrictEqual([]);
  });

  it("ranks query answers by descending confidence", () => {
    // Load (a new copy of) the response JSON:
    const response: ApiAnalyzeDocumentResponse = require("../data/test-query-response.json");
    // Since our sample doc only has single-answer queries, synthetically create extra answers for
    // a question:
    const queryBlock = (response.Blocks.filter((b) => b.BlockType === "QUERY") as ApiQueryBlock[])[0];
    const queryText = queryBlock.Query.Text;
    const answerRel = queryBlock.Relationships?.filter((r) => r.Type === ApiRelationshipType.Answer)[0];
    if (!answerRel) throw new Error("No answer relationship found in test response JSON");
    const dummyAnswer1: ApiQueryResultBlock = {
      BlockType: ApiBlockType.QueryResult,
      Confidence: 3,
      Id: "DUMMY-BLOCK-1",
      Page: 0,
      Text: "Dummy Answer 1",
      SearchKey: "Dummy Answer 1",
    };
    response.Blocks.push(dummyAnswer1);
    answerRel.Ids.push(dummyAnswer1.Id);
    const dummyAnswer2: ApiQueryResultBlock = {
      BlockType: ApiBlockType.QueryResult,
      Confidence: 4,
      Id: "DUMMY-BLOCK-2",
      Page: 0,
      Text: "Dummy Answer 2",
      SearchKey: "Dummy Answer 2",
    };
    response.Blocks.push(dummyAnswer2);
    answerRel.Ids.push(dummyAnswer2.Id);

    // Check the TRP behaves as expected:
    // TODO: This test is not ideal at the moment because test doc only has single-answer Qs.
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    // Cast types to keep IDE happy because it can't tell the following expect() will error on undef
    const query = page.queries.getQueryByQuestion(queryText) as QueryInstance;
    expect(query).toBeTruthy();
    const topResult = query.topResult as QueryResult;
    expect(topResult).toBeTruthy();

    const results = query.listResultsByConfidence();
    const resConfs = results.map((r) => r.confidence);
    expect(results[0]).toBe(topResult);
    expect(topResult.confidence).toStrictEqual(Math.max(...resConfs));
    expect(results[results.length - 1].confidence).toStrictEqual(Math.min(...resConfs));
  });

  it("produces human-readable query representations", () => {
    // TODO: This test is not ideal at the moment because test doc only has single-answer Qs.
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    // Cast types to keep IDE happy because it can't tell the following expect() will error on undef
    const query = page.queries.getQueryByAlias("name") as QueryInstance;
    expect(query).toBeTruthy();
    const topResult = query.topResult as QueryResult;
    expect(topResult).toBeTruthy();

    expect(topResult.str()).toStrictEqual(topResult.text);
    const queryStr = query.str();
    expect(queryStr).toContain("Query");
    expect(queryStr).toContain(query.text);
    expect(queryStr).toContain("Answers");
    expect(queryStr).toContain(topResult.text);

    const collStr = page.queries.str();
    for (const query of page.queries.iterQueries()) {
      expect(collStr).toContain(query.text);
      if (query.topResult) {
        expect(collStr).toContain(query.topResult.text);
      }
    }
  });

  it("provides access to underlying API result objects", () => {
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    // Cast types to keep IDE happy because it can't tell the following expect() will error on undef
    const query = page.queries.getQueryByAlias("name") as QueryInstance;
    expect(query).toBeTruthy();
    const topResult = query.topResult as QueryResult;
    expect(topResult).toBeTruthy();

    expect(query.dict.Query.Text).toStrictEqual(query.text);
    expect(topResult.dict.Confidence).toStrictEqual(topResult.confidence);
    expect(topResult.dict.Geometry?.Polygon[0].X).toStrictEqual(topResult.geometry?.polygon[0].x);
  });

  it("filters queries without answers", () => {
    // Load (a new copy of) the response JSON:
    const response: ApiAnalyzeDocumentResponse = require("../data/test-query-response.json");
    // Explicitly remove one of the query answers:
    const queryBlocks = response.Blocks.filter((b) => b.BlockType === "QUERY") as ApiQueryBlock[];
    queryBlocks[0].Relationships = [];
    const queryText = queryBlocks[0].Query.Text;

    // Check the TRP omits the unanswered query from results when instructed:
    const page = new TextractDocument(testResponseJson).pageNumber(1);
    expect(page.queries.nQueries).toStrictEqual(queryBlocks.length);
    expect(page.queries.listQueries().length).toStrictEqual(queryBlocks.length);
    expect(page.queries.listQueries({ skipUnanswered: true }).length).toStrictEqual(queryBlocks.length - 1);
    expect(page.queries.searchQueriesByQuestion(queryText).length).toStrictEqual(1);
    expect(page.queries.searchQueriesByQuestion(queryText, { skipUnanswered: true }).length).toStrictEqual(0);
  });
});
