/**
 * Layout analysis Textract API models used by the Textract response parser.
 *
 * This file collects types/interfaces specific to the Layout analysis functionality in general
 * document analysis: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
// Local Dependencies:
import { ApiBlockBase, ApiBlockType, ApiChildRelationship } from "./base";
import { ApiGeometry } from "./geometry";

// (Internal base interface to reduce duplication)
interface ApiLayoutBlockBase extends ApiBlockBase {
  /**
   * 0-100 based confidence of the detection of this layout object (*separate* from OCR confidence)
   *
   * This confidence reflects only the Layout model's scoring for identifying this structural
   * element in the document - not the OCR of the text/content within.
   */
  Confidence: number;
  Geometry: ApiGeometry; // (Geometry should always be present for Layout objects)
  /**
   * Content within the layout item, if any is present
   *
   * (Layout objects will nearly always have content, except e.g. LAYOUT_FIGURE)
   */
  Relationships?: ApiChildRelationship[];
}

/**
 * Layout Block representing an image / diagram / figure
 *
 * From example responses, these blocks are unlikely to contain any content.
 */
export interface ApiLayoutFigureBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutFigure;
}

/**
 * Layout Block representing an element of the page footer
 *
 * From example responses, there seems to be a separate element for each cluster of text (usually
 * horizontal clusters), each linking to LINE children. LAYOUT_PAGE_NUMBER blocks are peers, not
 * children.
 */
export interface ApiLayoutFooterBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutFooter;
}

/**
 * Layout Block representing an element of the page header
 *
 * From example responses, there seems to be a separate element for each cluster of text (usually
 * horizontal clusters), each linking to LINE children. LAYOUT_PAGE_NUMBER blocks are peers, not
 * children.
 */
export interface ApiLayoutHeaderBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutHeader;
}

/**
 * Layout Block representing a key-value / form field pair (use FORMS analysis for more detail)
 */
export interface ApiLayoutKeyValueBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutKeyValue;
}

/**
 * Layout Block representing a list (e.g. bullet points or numbered paragraphs)
 */
export interface ApiLayoutListBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutList;
}

/**
 * Layout Block representing a page number annotation
 *
 * From example responses, these link to (normally exactly one) LINE children
 */
export interface ApiLayoutPageNumberBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutPageNumber;
}

/**
 * Layout Block representing an individual section heading/title
 */
export interface ApiLayoutSectionHeaderBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutSectionHeader;
}

/**
 * Layout Block representing a table (use TABLES analysis for more detailed structure)
 */
export interface ApiLayoutTableBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutTable;
}

/**
 * Layout Block representing a paragraph of text
 */
export interface ApiLayoutTextBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutText;
}

/**
 * Layout Block representing a top-level document title
 */
export interface ApiLayoutTitleBlock extends ApiLayoutBlockBase {
  BlockType: ApiBlockType.LayoutTitle;
}

/**
 * All possible Blocks returned by Textract LAYOUT analysis of overall doc/page structure
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export type ApiLayoutBlock =
  | ApiLayoutFigureBlock
  | ApiLayoutFooterBlock
  | ApiLayoutHeaderBlock
  | ApiLayoutKeyValueBlock
  | ApiLayoutListBlock
  | ApiLayoutPageNumberBlock
  | ApiLayoutSectionHeaderBlock
  | ApiLayoutTableBlock
  | ApiLayoutTextBlock
  | ApiLayoutTitleBlock;
