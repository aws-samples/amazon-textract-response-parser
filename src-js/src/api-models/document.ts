/**
 * Document processing Textract API models used by the Textract Response Parser.
 *
 * This file collects types/interfaces specific to Textract's overall "document" APIs (rather than
 * e.g. Expense and Identity, or the individual components like Forms/Queries/Tables)
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-document-layout.html
 */
// Local Dependencies:
import { ApiBlockBase, ApiBlockType, ApiChildRelationship } from "./base";
import { ApiLineBlock, ApiSelectionElementBlock, ApiSignatureBlock, ApiWordBlock } from "./content";
import { ApiKeyValueSetBlock } from "./form";
import { ApiGeometry } from "./geometry";
import { ApiQueryBlock, ApiQueryResultBlock } from "./query";
import {
  ApiCellBlock,
  ApiMergedCellBlock,
  ApiTableBlock,
  ApiTableFooterBlock,
  ApiTableTitleBlock,
} from "./table";

// Temporary re-exports for consistency with old all-top-level API:
export {
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
  ApiRelationshipType,
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
  ApiAnswerRelationship,
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
  ApiChildRelationship,
  ApiComplexFeaturesRelationship,
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
  ApiMergedCellRelationship,
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
  ApiValueRelationship,
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
  ApiRelationship,
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
  ApiBlockType,
} from "./base";
export {
  /**
   * @deprecated Please import direct from `api-models/content` (or use `trp.api.content` in IIFE)
   */
  ApiTextType,
  /**
   * @deprecated Please import direct from `api-models/content` (or use `trp.api.content` in IIFE)
   */
  ApiWordBlock,
  /**
   * @deprecated Please import direct from `api-models/content` (or use `trp.api.content` in IIFE)
   */
  ApiLineBlock,
  /**
   * @deprecated Please import direct from `api-models/content` (or use `trp.api.content` in IIFE)
   */
  ApiSelectionStatus,
  /**
   * @deprecated Please import direct from `api-models/content` (or use `trp.api.content` in IIFE)
   */
  ApiSelectionElementBlock,
} from "./content";
export {
  /**
   * @deprecated Please import direct from `api-models/form` (or use `trp.api.form` in IIFE)
   */
  ApiKeyValueEntityType,
  /**
   * @deprecated Please import direct from `api-models/form` (or use `trp.api.form` in IIFE)
   */
  ApiKeyValueSetBlock,
} from "./form";
export {
  /**
   * @deprecated Please import direct from `api-models/query` (or use `trp.api.query` in IIFE)
   */
  ApiQueryBlock,
  /**
   * @deprecated Please import direct from `api-models/query` (or use `trp.api.query` in IIFE)
   */
  ApiQueryResultBlock,
} from "./query";
export {
  /**
   * @deprecated Please import direct from `api-models/table` (or use `trp.api.table` in IIFE)
   */
  ApiTableEntityType,
  /**
   * @deprecated Please import direct from `api-models/table` (or use `trp.api.table` in IIFE)
   */
  ApiTableBlock,
  /**
   * @deprecated Please import direct from `api-models/table` (or use `trp.api.table` in IIFE)
   */
  ApiTableCellEntityType,
  /**
   * @deprecated Please import direct from `api-models/table` (or use `trp.api.table` in IIFE)
   */
  ApiCellBlock,
  /**
   * @deprecated Please import direct from `api-models/table` (or use `trp.api.table` in IIFE)
   */
  ApiMergedCellBlock,
} from "./table";

/**
 * Block representing an overall page within a (potentially multi-page) document
 */
export interface ApiPageBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Page;
  Geometry: ApiGeometry; // Always present for PAGE blocks
  /**
   * Top-level content contained within this page
   *
   * (These Blocks may in turn link to further sub-levels e.g. from TABLE to CELL)
   */
  readonly Relationships?: ApiChildRelationship[];
}

/**
 * Type describing actual 'Block' objects returnable by Textract general document analysis
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_Block.html
 */
export type ApiBlock =
  | ApiCellBlock
  | ApiKeyValueSetBlock
  | ApiLineBlock
  | ApiMergedCellBlock
  | ApiPageBlock
  | ApiQueryBlock
  | ApiQueryResultBlock
  | ApiSelectionElementBlock
  | ApiSignatureBlock
  | ApiTableBlock
  | ApiTableFooterBlock
  | ApiTableTitleBlock
  | ApiWordBlock;
