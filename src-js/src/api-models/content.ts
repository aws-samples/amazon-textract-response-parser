/**
 * Low-level content Textract API models used by the Textract Response Parser.
 *
 * This file collects types/interfaces specific to the low level text/content objects detected by
 * general document analysis, including text words/lines and selection elements.
 *
 * See:
 * - https://docs.aws.amazon.com/textract/latest/dg/how-it-works-lines-words.html
 * - https://docs.aws.amazon.com/textract/latest/dg/how-it-works-selectables.html
 */
// Local Dependencies:
import { ApiBlockBase, ApiBlockType, ApiChildRelationship } from "./base";
import { ApiGeometry } from "./geometry";

/**
 * Enumeration of detectable text types: handwriting vs computer printed text
 */
export const enum ApiTextType {
  Handwriting = "HANDWRITING",
  Printed = "PRINTED",
}

/**
 * Block representing a contiguous sequence of characters with no whitespace
 *
 * (Might include e.g. hyphens, underscores, etc)
 */
export interface ApiWordBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Word;
  /**
   * 0-100 based confidence of the OCR model in extracting the text of this word
   */
  Confidence: number;
  Geometry: ApiGeometry; // Should always be present for WORD blocks
  /**
   * Text extracted by the OCR model
   */
  Text: string;
  /**
   * Whether the text appears hand-written or computer-generated
   */
  TextType: ApiTextType;
}

/**
 * Block representing a contiguous sequence of whitespace-separated WORDs
 */
export interface ApiLineBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Line;
  /**
   * TODO: Is this confidence of structure or aggregate of child words' OCR?
   */
  Confidence: number;
  Geometry: ApiGeometry; // Should always be present for LINE blocks
  /**
   * Links to individual WORD blocks in this line
   */
  readonly Relationships: ApiChildRelationship[];
  /**
   * Pre-computed concatenated text for the overall line - no need to loop through
   */
  Text: string;
}

/**
 * Enumeration of (boolean) states a selection element can take
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-selectables.html
 */
export const enum ApiSelectionStatus {
  Selected = "SELECTED",
  NotSelected = "NOT_SELECTED",
}

/**
 * Block representing a selection element (e.g. checkbox, radio button, circled option)
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-selectables.html
 */
export interface ApiSelectionElementBlock extends ApiBlockBase {
  BlockType: ApiBlockType.SelectionElement;
  /**
   * 0-100 based confidence of the model detecting this selection element and its status
   */
  Confidence: number;
  Geometry: ApiGeometry; // Should always be present for SELECTION_ELEMENT blocks
  /**
   * Whether the element is selected/ticked/checked/etc, or not
   */
  SelectionStatus: ApiSelectionStatus;
}
