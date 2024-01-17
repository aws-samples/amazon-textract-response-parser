/**
 * Form data (key-value pairs) analysis Textract API models used by the Textract Response Parser.
 *
 * This file collects types/interfaces specific to the Form data / Key-Value pairs functionality in
 * general document analysis: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
 */
// Local Dependencies:
import { ApiBlockBase, ApiBlockType, ApiChildRelationship, ApiValueRelationship } from "./base";
import { ApiGeometry } from "./geometry";

/**
 * Enumeration of EntityTypes supported for form key/value objects
 */
export const enum ApiKeyValueEntityType {
  /**
   * The key or "label" of the pair
   */
  Key = "KEY",
  /**
   * The value or "data" of the pair
   */
  Value = "VALUE",
}

/**
 * Either a key or a value item for a key-value pair in a Forms analysis result
 *
 * This `KEY_VALUE_SET` BlockType is used to indicate both key and value in K-V results, with the
 * `EntityTypes` (and relationship patterns) differentiating between the two.
 */
export interface ApiKeyValueSetBlock extends ApiBlockBase {
  BlockType: ApiBlockType.KeyValueSet;
  /**
   * 0-100 based confidence of the key-value structure model (*separate* from text OCR confidence!)
   *
   * Confidence of the key-value relation is separate from text extraction confidence.
   */
  Confidence: number;
  /**
   * Differentiates whether this block is a KEY or a VALUE in the K-V pair
   */
  EntityTypes: ApiKeyValueEntityType[];
  Geometry: ApiGeometry; // Believe Geometry should always be present on this block type
  /**
   * Links to text (CHILD) blocks and corresponding value/result (VALUE when EntityTypes=KEY)
   *
   * May not be present for VALUE blocks with no text (empty/unfilled form elements)
   */
  Relationships?: Array<ApiChildRelationship | ApiValueRelationship>;
}
