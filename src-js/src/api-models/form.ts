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
 * Alternative style for Key (label) item in a Forms key-value pair
 * 
 * Conventionally, forms results appear to use KEY_VALUE_SET blocks for both key and value.
 * However, distinct 'KEY' and 'VALUE' blocks were observed in some responses.
 */
export interface ApiKeyBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Key;
  /**
   * 0-100 based confidence that this is a K-V key (*separate* from actual text OCR confidence!)
   */
  Confidence: number;
  /**
   * For compatibility with KEY_VALUE_SET, but always contains KEY for this BlockType
   */
  EntityTypes: ApiKeyValueEntityType.Key[];
  Geometry: ApiGeometry; // Believe Geometry should always be present on this block type
  /**
   * Links to key text (CHILD) blocks and corresponding value/result (VALUE)
   */
  Relationships: Array<ApiChildRelationship | ApiValueRelationship>;
}

/**
 * Either a key or a value item for a key-value pair in a Forms analysis result
 *
 * Usually this `KEY_VALUE_SET` BlockType is used to indicate both key and value in K-V results,
 * with the `EntityTypes` (and relationship patterns) differentiating between the two. In some
 * cases, an alternative pattern has been observed using distinct `KEY` and `VALUE` blocks instead.
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

/**
 * Alternative style for Value (data) item in a Forms key-value pair
 * 
 * Conventionally, forms results appear to use KEY_VALUE_SET blocks for both key and value.
 * However, distinct 'KEY' and 'VALUE' blocks were observed in some responses.
 */
export interface ApiValueBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Value;
  /**
   * 0-100 based confidence of this key-value relation (*separate* from text OCR confidence!)
   */
  Confidence: number;
  /**
   * For compatibility with KEY_VALUE_SET, but always contains VALUE for this BlockType
   */
  EntityTypes: ApiKeyValueEntityType.Value[];
  Geometry: ApiGeometry; // Believe Geometry should always be present on this block type
  // `Relationships` may not be present when the value is empty/unfilled
  /**
   * Links to value text (CHILD) blocks, if present (might not be for empty/unfilled form elements)
   */
  Relationships?: ApiChildRelationship[];
}
