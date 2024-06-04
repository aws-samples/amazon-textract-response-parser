/**
 * TRP classes for (generic document) query objects
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */

// Local Dependencies:
import { ApiBlockType, ApiRelationshipType } from "./api-models/base";
import { ApiQueryBlock, ApiQueryResultBlock } from "./api-models/query";
import {
  argMax,
  escapeHtml,
  getIterable,
  indent,
  IBlockManager,
  IRenderable,
  PageHostedApiBlockWrapper,
} from "./base";
import { Geometry } from "./geometry";

/**
 * Generic base class for a QueryResult, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/QueryResult`.
 */
export class QueryResultGeneric<TPage extends IBlockManager>
  extends PageHostedApiBlockWrapper<ApiQueryResultBlock, TPage>
  implements IRenderable
{
  _geometry?: Geometry<ApiQueryResultBlock, QueryResultGeneric<TPage>>;
  _parentQuery: QueryInstanceGeneric<TPage>;

  constructor(block: ApiQueryResultBlock, parentQuery: QueryInstanceGeneric<TPage>) {
    super(block, parentQuery.parentPage);
    this._geometry = block.Geometry ? new Geometry(block.Geometry, this) : undefined;
    this._parentQuery = parentQuery;
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  /**
   * geometry may be undefined for interpreted (rather than literal) query answers.
   */
  get geometry(): undefined | Geometry<ApiQueryResultBlock, QueryResultGeneric<TPage>> {
    return this._geometry;
  }
  get parentQuery(): QueryInstanceGeneric<TPage> {
    return this._parentQuery;
  }
  get text(): string {
    return this._dict.Text;
  }

  /**
   * The semantic `html()` representation of a query result is just its (HTML-escaped) text
   */
  html(): string {
    return escapeHtml(this.text);
  }

  str(): string {
    return this.text;
  }
}

/**
 * Generic base class for a QueryInstance, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/QueryResult`.
 */
export class QueryInstanceGeneric<TPage extends IBlockManager>
  extends PageHostedApiBlockWrapper<ApiQueryBlock, TPage>
  implements IRenderable
{
  constructor(block: ApiQueryBlock, parentPage: TPage) {
    super(block, parentPage);
    this._parentPage = parentPage;

    // Parsing of QUERY_RESULT objects is handled by this QueryInstanceGeneric:
    this.relatedBlockIdsByRelType(ApiRelationshipType.Answer).forEach((id) => {
      const ansBlock = parentPage.getBlockById(id);
      if (!ansBlock) {
        console.warn(
          `Answer block ${id} referenced by QUERY block ${block.Id} is missing and will be skipped`,
        );
      } else if (ansBlock.BlockType !== ApiBlockType.QueryResult) {
        console.warn(
          `Expected block ${id} to be of type ${ApiBlockType.QueryResult} as referenced by QUERY block ${block.Id}, but got type: ${ansBlock.BlockType}`,
        );
      } else {
        // Automatically self-registers with the parent block manager (page):
        new QueryResultGeneric(ansBlock, this);
      }
    });
  }

  /**
   * Alias of the query as configured in the original AnalyzeDocument request (if one was set)
   */
  get alias(): string | undefined {
    return this._dict.Query.Alias;
  }
  get nResults(): number {
    return this._listResults().length;
  }

  /**
   * Text of the input query (question)
   */
  get text(): string {
    return this._dict.Query.Text;
  }

  /**
   * Retrieve the top result by confidence score, if any are available.
   */
  get topResult(): QueryResultGeneric<TPage> | undefined {
    const results = this._listResults();
    const top = argMax(results.map((r) => r.confidence));
    if (top.maxIndex < 0) return undefined;
    return results[top.maxIndex];
  }

  /**
   * List this query instance's results, in raw Amazon Textract response order
   *
   * Any invalid relationship block IDs will be skipped from the list (no logs)
   *
   * TODO: Refactor to use list/iterRelatedItemsByRelType when ready for breaking change
   *
   * This refactor will require changing the handling of invalid JSONs (i.e. missing blocks) for
   * more consistency between different modules of TRP.js.
   */
  protected _listResults(): QueryResultGeneric<TPage>[] {
    return this.relatedBlockIdsByRelType(ApiRelationshipType.Answer)
      .map((id) => {
        try {
          return this.parentPage.getItemByBlockId(id, ApiBlockType.QueryResult) as QueryResultGeneric<TPage>;
        } catch {
          return null as unknown as QueryResultGeneric<TPage>;
        }
      })
      .filter((obj) => obj);
  }

  /**
   * List this query instance's results, sorted from the most to least confident.
   */
  listResultsByConfidence(): QueryResultGeneric<TPage>[] {
    return this._listResults()
      .slice()
      .sort(
        // Negative -> a sorted before b
        (a, b) => b.confidence - a.confidence,
      );
  }

  /**
   * The HTML for a `QueryInstance` uses a `<div>` of class "query"
   *
   * The question itself is presented within `<p>` tags, and then a bulleted list of the answers /
   * results in order of descending confidence.
   */
  html(): string {
    const resultsByConf = this.listResultsByConfidence();
    const resultsHtml = resultsByConf.map((res) => `<li>${res.html()}</li>`).join("\n");
    return [
      '<div class="query">',
      indent(`<p>${escapeHtml(this.text)}</p>`),
      indent(resultsByConf.length ? ["<ul>", indent(resultsHtml), "</ul>"].join("\n") : "<ul></ul>"),
      "</div>",
    ].join("\n");
  }

  /**
   * Generate a human-readable representation of this query instance
   */
  str(): string {
    return `Query\n==========\nQuestion: ${this.text}\nAnswers:\n - ${this.listResultsByConfidence()
      .map((r) => r.text)
      .join("\n - ")}`;
  }
}

/**
 * Configuration options for listing/filtering Amazon Textract Queries
 */
export interface IFilterQueryOpts {
  /**
   * Set `true` to skip queries with no answers (by default, they're included)
   */
  skipUnanswered?: boolean;
}

/**
 * Generic base class for a collection of query instances, as parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/QueryInstanceCollection`.
 */
export class QueryInstanceCollectionGeneric<TPage extends IBlockManager> implements IRenderable {
  _queries: QueryInstanceGeneric<TPage>[];
  _parentPage: TPage;

  constructor(queryBlocks: ApiQueryBlock[], parentPage: TPage) {
    this._queries = [];
    this._parentPage = parentPage;

    queryBlocks.forEach((queryBlock) => {
      this._queries.push(new QueryInstanceGeneric(queryBlock, parentPage));
    });
  }

  get nQueries(): number {
    return this._queries.length;
  }
  get parentPage(): TPage {
    return this._parentPage;
  }

  /**
   * Return the text content of all queries and their results, ordered by confidence score
   */
  get text(): string {
    return this._queries
      .map(
        (query) =>
          `${query.text}\n${query
            .listResultsByConfidence()
            .map((r) => r.text)
            .join("\n")}`,
      )
      .join("\n\n");
  }

  /**
   * Find a query by exact match of query alias, if one exists
   * @param alias Alias provided for the query (in the Amazon Textract AnalyzeDocument request)
   * @returns A matching query instance, or undefined if none is found
   */
  getQueryByAlias(alias: string): QueryInstanceGeneric<TPage> | undefined {
    if (!alias) return;
    return this._queries.find((q) => q.alias === alias);
  }

  /**
   * Find a query by exact match of query text (question), if one exists
   * @param question Text of the original query (in the Amazon Textract AnalyzeDocument request)
   * @returns A matching query instance, or undefined if none is found
   */
  getQueryByQuestion(question: string): QueryInstanceGeneric<TPage> | undefined {
    if (!question) return;
    return this._queries.find((q) => q.text === question);
  }

  /**
   * The `html()` for a QueryCollection lists all queries within a `<div>` of class "queries"
   */
  html(): string {
    return ['<div class="queries">', indent(this._queries.map((q) => q.html()).join("\n")), "</div>"].join(
      "\n",
    );
  }

  /**
   * Iterate through the Queries in the collection.
   * @param opts Filtering options to control which queries are included
   * @example
   * for (const query of q.iterQueries()) {
   *   console.log(query.text);
   * }
   * @example
   * const queries = [...q.iterQueries()];
   */
  iterQueries(opts: IFilterQueryOpts = {}): Iterable<QueryInstanceGeneric<TPage>> {
    return getIterable(() => this.listQueries(opts));
  }

  /**
   * List the Queries in the collection.
   * @param opts Filtering options to control which queries are included
   */
  listQueries(opts: IFilterQueryOpts = {}): QueryInstanceGeneric<TPage>[] {
    return opts.skipUnanswered ? this._queries.filter((q) => q.nResults > 0) : this._queries.slice();
  }

  /**
   * List the Queries in the collection with alias text containing (case-insensitive) `alias`
   * @param alias The text to search for in query aliases
   * @param opts Filtering options to control which queries are included in the search
   */
  searchQueriesByAlias(alias: string, opts: IFilterQueryOpts = {}): QueryInstanceGeneric<TPage>[] {
    if (!alias) return [];
    const searchKey = alias.toLowerCase();
    return this.listQueries(opts).filter((q) => q.alias && q.alias.toLowerCase().indexOf(searchKey) >= 0);
  }

  /**
   * List the Queries in the collection with question text containing (case-insensitive) `question`
   * @param question The text to search for in query text
   * @param opts Filtering options to control which queries are included in the search
   */
  searchQueriesByQuestion(question: string, opts: IFilterQueryOpts = {}): QueryInstanceGeneric<TPage>[] {
    if (!question) return [];
    const searchKey = question.toLowerCase();
    return this.listQueries(opts).filter((q) => q.text.toLowerCase().indexOf(searchKey) >= 0);
  }

  /**
   * Generate a human-readable representation of the query collection
   */
  str(): string {
    return this._queries.map((q) => q.str()).join("\n");
  }
}
