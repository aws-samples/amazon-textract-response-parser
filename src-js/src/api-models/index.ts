/**
 * Amazon Textract API models (TypeScript interfaces) used by the response parser.

 * While these models should correspond fairly closely to those in the actual typings for the
 * @aws-sdk/client-textract module, there may be some cases where we can be more specific - and
 * maintaining lets us avoid introducing dependencies of the AWS SDK for JS.
 *
 * Re-exporting sub-modules is not ideal for performance, but we need to do it for in-browser IIFE
 * users (who'd otherwise not have any way to access the nested exported components).
 */

export * as base from "./base";
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
  /**
   * @deprecated Please import direct from `api-models/base` (or use `trp.api.base` in IIFE)
   */
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

export * as content from "./content";
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

export * as document from "./document";
export {
  /**
   * @deprecated Please import direct from `api-models/document` (or use `trp.api.document` in IIFE)
   */
  ApiPageBlock,
  /**
   * @deprecated Please import direct from `api-models/document` (or use `trp.api.document` in IIFE)
   */
  ApiBlock,
} from "./document";

export * as expense from "./expense";
export {
  /**
   * @deprecated Please import direct from `api-models/expense` (or use `trp.api.expense` in IIFE)
   */
  ApiExpenseComponentDetection,
  /**
   * @deprecated Please import direct from `api-models/expense` (or use `trp.api.expense` in IIFE)
   */
  ApiExpenseFieldType,
  /**
   * @deprecated Please import direct from `api-models/expense` (or use `trp.api.expense` in IIFE)
   */
  ApiExpenseField,
  /**
   * @deprecated Please import direct from `api-models/expense` (or use `trp.api.expense` in IIFE)
   */
  ApiExpenseLineItem,
  /**
   * @deprecated Please import direct from `api-models/expense` (or use `trp.api.expense` in IIFE)
   */
  ApiExpenseLineItemGroup,
  /**
   * @deprecated Please import direct from `api-models/expense` (or use `trp.api.expense` in IIFE)
   */
  ApiExpenseDocument,
} from "./expense";

export * as form from "./form";
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

export * as geometry from "./geometry";
export {
  /**
   * @deprecated Please import direct from `api-models/geometry` (or `trp.api.geometry` in IIFE)
   */
  ApiBoundingBox,
  /**
   * @deprecated Please import direct from `api-models/geometry` (or `trp.api.geometry` in IIFE)
   */
  ApiPoint,
  /**
   * @deprecated Please import direct from `api-models/geometry` (or `trp.api.geometry` in IIFE)
   */
  ApiGeometry,
} from "./geometry";

export * as id from "./id";
export {
  /**
   * @deprecated Please import direct from `api-models/id` (or use `trp.api.id` in IIFE)
   */
  ApiIdentityDocumentFieldType,
  /**
   * @deprecated Please import direct from `api-models/id` (or use `trp.api.id` in IIFE)
   */
  ApiIdentityDocumentFieldValueDetection,
  /**
   * @deprecated Please import direct from `api-models/id` (or use `trp.api.id` in IIFE)
   */
  ApiIdentityDocumentField,
  /**
   * @deprecated Please import direct from `api-models/id` (or use `trp.api.id` in IIFE)
   */
  ApiIdentityDocument,
} from "./id";

export * as query from "./query";
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

export * as response from "./response";
export {
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiJobStatus,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiDocumentMetadata,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAnalyzeExpenseResponse,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAnalyzeIdResponse,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiResponseWithContent,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAnalyzeDocumentResponse,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiDetectDocumentTextResponse,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAsyncJobOuputInProgress,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiResultWarning,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAsyncJobOuputSucceded,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAsyncJobOutputPartialSuccess,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAsyncJobOutputFailed,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAsyncDocumentAnalysis,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiAsyncDocumentTextDetection,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiResponsePage,
  /**
   * @deprecated Please import direct from `api-models/response` (or `trp.api.response` in IIFE)
   */
  ApiResponsePages,
} from "./response";

export * as table from "./table";
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
