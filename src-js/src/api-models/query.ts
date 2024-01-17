/**
 * Queries analysis Textract API models used by the Textract Response Parser.
 *
 * This file collects types/interfaces specific to the Amazon Textract Queries functionality:
 * https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */
// Local Dependencies:
import { ApiAnswerRelationship, ApiBlockBase, ApiBlockType } from "./base";

/**
 * Page-level instance of the input Query/question submitted for the analysis
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */
export interface ApiQueryBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Query;
  /**
   * Since QUERY blocks represent input questions, they don't carry confidence scores
   */
  Confidence: never;
  /**
   * Page number for this query block
   *
   * When a query is applied to multiple pages, it generates several QUERY blocks in the result -
   * each the 'CHILD' of one page and each with a Page number.
   */
  Page?: number;
  /**
   * The Query input to the API
   */
  readonly Query: {
    /**
     * The optional unique alias provided for this query (to simplify retrieval/searching)
     */
    Alias?: string;
    /**
     * The original question/query text
     */
    Text: string;
  };
  /**
   * Links to (potentially multiple) QUERY_RESULT answer objects, if any were found.
   */
  Relationships?: ApiAnswerRelationship[];
}

/**
 * Detected result/answer for a Query
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */
export interface ApiQueryResultBlock extends ApiBlockBase {
  BlockType: ApiBlockType.QueryResult;
  /**
   * 0-100 based confidence of the Textract model for this answer to the Query
   */
  Confidence: number;
  /**
   * Page number for this query result
   *
   * If not present, refer to the linked QUERY's parent PAGE
   */
  Page?: number;
  /**
   * Text of the result
   */
  Text: string;
  /**
   * QUERY_RESULT blocks do not seem to link answers through to underlying WORD/LINEs/etc
   */
  Relationships?: never[];
  /**
   * (Legacy) when present, appeared to mirror `Text` - which should be preferred
   *
   * @deprecated Does not seem to be in use in current responses
   */
  SearchKey?: string;
}
