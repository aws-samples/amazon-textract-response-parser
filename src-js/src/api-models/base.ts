/**
 * Common Textract API models used by (multiple features in) the Textract Response Parser.
 *
 * This file collects types/interfaces common across multiple API sections.
 */
// Local Dependencies:
import { ApiGeometry } from "./geometry";

/**
 * Enumeration of all inter-Block Relationship types defined by Textract
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_Relationship.html
 */
export const enum ApiRelationshipType {
  /**
   * Used to link QUERY blocks to QUERY_RESULTs
   */
  Answer = "ANSWER",
  /**
   * Used in a range of block types to link content within the block (e.g. LINE->WORD)
   */
  Child = "CHILD",
  /**
   * TODO: Usage of this type is not clear at time of writing
   */
  ComplexFeatures = "COMPLEX_FEATURES",
  /**
   * Used to link from a TABLE to its MERGED_CELL children
   *
   * (CHILD is used for the table's standard/un-merged CELL blocks, and from MERGED_CELL->CELL)
   */
  MergedCell = "MERGED_CELL",
  /**
   * Used to link from a TABLE to its associated TABLE_FOOTER, if present
   */
  TableFooter = "TABLE_FOOTER",
  /**
   * Used to link from a TABLE to its associated TABLE_TITLE, if present
   */
  TableTitle = "TABLE_TITLE",
  /**
   * Used to link from a forms/K-V KEY block to its associated VALUE block
   */
  Value = "VALUE",
}

/**
 * Internal interface for Relationships linking a `Block` to a list of (one or more) others
 *
 * See `ApiRelationship` and: https://docs.aws.amazon.com/textract/latest/dg/API_Relationship.html
 */
interface IRelationshipBase {
  /**
   * Unique IDs of target API `Block`s linked by the relationship
   */
  Ids: string[];
  /**
   * Semantic type of this relationship
   */
  Type: ApiRelationshipType;
}

export interface ApiAnswerRelationship extends IRelationshipBase {
  Type: ApiRelationshipType.Answer;
}

export interface ApiChildRelationship extends IRelationshipBase {
  Type: ApiRelationshipType.Child;
}

export interface ApiComplexFeaturesRelationship extends IRelationshipBase {
  Type: ApiRelationshipType.ComplexFeatures;
}

export interface ApiMergedCellRelationship extends IRelationshipBase {
  Type: ApiRelationshipType.MergedCell;
}

export interface ApiTableFooterRelationship extends IRelationshipBase {
  Type: ApiRelationshipType.TableFooter;
}

export interface ApiTableTitleRelationship extends IRelationshipBase {
  Type: ApiRelationshipType.TableTitle;
}

export interface ApiValueRelationship extends IRelationshipBase {
  Type: ApiRelationshipType.Value;
}

/**
 * Relationship linking a `Block` to a list of (one or more) others
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_Relationship.html
 */
export type ApiRelationship =
  | ApiAnswerRelationship
  | ApiChildRelationship
  | ApiComplexFeaturesRelationship
  | ApiMergedCellRelationship
  | ApiTableFooterRelationship
  | ApiTableTitleRelationship
  | ApiValueRelationship;

/**
 * Enumeration of all types of `Block` (content item) detected by Amazon Textract
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_Block.html
 */
export const enum ApiBlockType {
  /**
   * Plain table cell ignoring any merges (see MERGED_CELL instead)
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
   */
  Cell = "CELL",
  /**
   * Key element for a Form Data Key-Value pair (alternative style seen in some test cases)
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
   */
  Key = "KEY",
  /**
   * Compound block for Form Key-Value pairs - more recently replaced by KEY and VALUE
   *
   * Textract Form data results used to use this type for both the Key and Value of detected K-V
   * pairs, with the `EntityType` field (and relationships) differentiating which was which. More
   * recent responses appear to only use `KEY` and `VALUE` BlockTypes instead.
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
   */
  KeyValueSet = "KEY_VALUE_SET",
  /**
   * Layout analysis result for a diagram / image / figure
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutFigure = "LAYOUT_FIGURE",
  /**
   * Layout analysis result segmenting page footer from other content
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutFooter = "LAYOUT_FOOTER",
  /**
   * Layout analysis result segmenting page header from other content
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutHeader = "LAYOUT_HEADER",
  /**
   * Layout analysis result for a Forms Key-Value pair
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutKeyValue = "LAYOUT_KEY_VALUE",
  /**
   * Layout analysis result for a list (e.g. bullet points or numbered paragraphs)
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutList = "LAYOUT_LIST",
  /**
   * Layout analysis result for a page number annotation
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutPageNumber = "LAYOUT_PAGE_NUMBER",
  /**
   * Layout analysis result for a section-level heading
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutSectionHeader = "LAYOUT_SECTION_HEADER",
  /**
   * Layout analysis result for a table
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutTable = "LAYOUT_TABLE",
  /**
   * Layout analysis result for a paragraph of text
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutText = "LAYOUT_TEXT",
  /**
   * Layout analysis result for the main title of the document
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  LayoutTitle = "LAYOUT_TITLE",
  /**
   * A contiguous string of non-breaking-whitespace separated `WORD`s
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-lines-words.html
   */
  Line = "LINE",
  /**
   * Merged cell spanning multiple underlying rows or columns of a TABLE
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
   */
  MergedCell = "MERGED_CELL",
  /**
   * Top-level container for an individual page (also present for single-image/-page requests)
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-pages.html
   */
  Page = "PAGE",
  /**
   * Page-level instance of an input "Query" asked of the document
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
   */
  Query = "QUERY",
  /**
   * (Potentially one of multiple) results returned for an input QUERY
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
   */
  QueryResult = "QUERY_RESULT",
  /**
   * A boolean selection element such as a checkbox, radio button, circled word, etc
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-selectables.html
   */
  SelectionElement = "SELECTION_ELEMENT",
  /**
   * A detected signature (possibly in a key-value pair or table cell)
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-analyzing.html
   */
  Signature = "SIGNATURE",
  /**
   * An overall table object
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
   */
  Table = "TABLE",
  /**
   * A trailing/footer caption associated with a TABLE
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
   */
  TableFooter = "TABLE_FOOTER",
  /**
   * A leading/header caption associated with a TABLE
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
   */
  TableTitle = "TABLE_TITLE",
  /**
   * Value element for a Form Data Key-Value pair (alternative style seen in some test cases)
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
   */
  Value = "VALUE",
  /**
   * An individual "word" of text (string of characters not separated by whitespace)
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-lines-words.html
   */
  Word = "WORD",
}

/**
 * Canonical Set of API block types counted as Layout* elements
 */
export const LAYOUT_BLOCK_TYPES = new Set([
  ApiBlockType.LayoutFigure,
  ApiBlockType.LayoutFooter,
  ApiBlockType.LayoutHeader,
  ApiBlockType.LayoutKeyValue,
  ApiBlockType.LayoutList,
  ApiBlockType.LayoutPageNumber,
  ApiBlockType.LayoutSectionHeader,
  ApiBlockType.LayoutTable,
  ApiBlockType.LayoutText,
  ApiBlockType.LayoutTitle,
]);

/**
 * Check if an API Block.BlockType corresponds to a Layout* element.
 */
export function isLayoutBlockType(blockType: ApiBlockType): boolean {
  return LAYOUT_BLOCK_TYPES.has(blockType);
}

/**
 * Basic interface common to all types of Textract API `Block` (individual detected items)
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_Block.html
 */
export interface ApiBlockBase {
  /**
   * Type of item detected
   */
  BlockType: ApiBlockType;
  /**
   * 0-100 based confidence score the model assigned to this detection
   *
   * (May not be present on all block types, for example QUERY)
   */
  Confidence?: number;
  /**
   * Position of the item on the input image / page
   */
  Geometry?: ApiGeometry;
  /**
   * Unique ID of this `Block`
   *
   * As mentioned in https://docs.aws.amazon.com/textract/latest/dg/API_Block.html this ID is only
   * technically guaranteed to be unique within the scope of the API request
   */
  readonly Id: string;
  /**
   * Related Blocks
   */
  readonly Relationships?: ApiRelationship[];
}
