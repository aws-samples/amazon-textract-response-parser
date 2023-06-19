/**
 * TRP classes for (generic document) query objects
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */

// Local Dependencies:
import { ApiBlockType, ApiQueryBlock, ApiQueryResultBlock, ApiRelationshipType } from "./api-models/document";
import { ApiBlockWrapper, argMax, getIterable, WithParentDocBlocks } from "./base";
import { Geometry } from "./geometry";

/**
 * Generic base class for a QueryResult, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/QueryResult`.
 */
export class QueryResultGeneric<
  TPage extends WithParentDocBlocks
> extends ApiBlockWrapper<ApiQueryResultBlock> {
  _geometry?: Geometry<ApiQueryResultBlock, QueryResultGeneric<TPage>>;
  _parentQuery: QueryInstanceGeneric<TPage>;

  constructor(block: ApiQueryResultBlock, parentQuery: QueryInstanceGeneric<TPage>) {
    super(block);
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
  get parentPage(): TPage {
    return this._parentQuery._parentPage;
  }
  get text(): string {
    return this._dict.Text;
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
export class QueryInstanceGeneric<TPage extends WithParentDocBlocks> extends ApiBlockWrapper<ApiQueryBlock> {
  _parentPage: TPage;
  _results: QueryResultGeneric<TPage>[];

  constructor(block: ApiQueryBlock, parentPage: TPage) {
    super(block);

    this._results = [];
    this._parentPage = parentPage;
    const parentDocument = parentPage.parentDocument;
    (block.Relationships || []).forEach((rs) => {
      if (rs.Type == ApiRelationshipType.Answer) {
        rs.Ids.forEach((id) => {
          const ansBlock = parentDocument.getBlockById(id);
          if (!ansBlock) {
            // Leave missing block warnings up to parent
            return;
          } else if (ansBlock.BlockType !== ApiBlockType.QueryResult) {
            console.warn(
              `Expected block ${id} to be of type ${ApiBlockType.QueryResult} as referenced by QUERY block ${block.Id}, but got type: ${ansBlock.BlockType}`
            );
          } else {
            this._results.push(new QueryResultGeneric(ansBlock, this));
          }
        });
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
    return this._results.length;
  }
  get parentPage(): TPage {
    return this._parentPage;
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
    const top = argMax(this._results.map((r) => r.confidence));
    if (top.maxIndex < 0) return undefined;
    return this._results[top.maxIndex];
  }

  /**
   * List this query instance's results, sorted from the most to least confident.
   */
  listResultsByConfidence(): QueryResultGeneric<TPage>[] {
    return this._results.slice().sort(
      // Negative -> a sorted before b
      (a, b) => b.confidence - a.confidence
    );
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
 * Generic base class for a collection of query instances, as parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/QueryInstanceCollection`.
 */
export class QueryInstanceCollectionGeneric<TPage extends WithParentDocBlocks> {
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
   * Iterate through the Queries in the collection.
   * @param skipUnanswered Set `true` to skip queries with no answers (included by default)
   * @example
   * for (const query of q.iterQueries()) {
   *   console.log(query.text);
   * }
   * @example
   * const queries = [...q.iterQueries()];
   */
  iterQueries(skipUnanswered = false): Iterable<QueryInstanceGeneric<TPage>> {
    return getIterable(() => this.listQueries(skipUnanswered));
  }

  /**
   * List the Queries in the collection.
   * @param skipUnanswered Set `true` to skip queries with no answers (included by default)
   */
  listQueries(skipUnanswered = false): QueryInstanceGeneric<TPage>[] {
    return skipUnanswered ? this._queries.filter((q) => q.nResults > 0) : this._queries.slice();
  }

  /**
   * List the Queries in the collection with alias text containing (case-insensitive) `alias`
   * @param alias The text to search for in query aliases
   */
  searchQueriesByAlias(alias: string): QueryInstanceGeneric<TPage>[] {
    if (!alias) return [];
    const searchKey = alias.toLowerCase();
    return this._queries.filter((q) => q.alias && q.alias.toLowerCase().indexOf(searchKey) >= 0);
  }

  /**
   * List the Queries in the collection with question text containing (case-insensitive) `question`
   * @param question The text to search for in query text
   */
  searchQueriesByQuestion(question: string): QueryInstanceGeneric<TPage>[] {
    if (!question) return [];
    const searchKey = question.toLowerCase();
    return this._queries.filter((q) => q.text.toLowerCase().indexOf(searchKey) >= 0);
  }

  /**
   * Generate a human-readable representation of the query collection
   */
  str(): string {
    return this._queries.map((q) => q.str()).join("\n");
  }
}
