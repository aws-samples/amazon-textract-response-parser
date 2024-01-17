/**
 * Amazon Textract Response Parser (JS/TS) main entry point
 *
 * See 'api-models' for underlying API data types, 'document' for utility classes wrapping standard
 * document analysis/OCR jobs (e.g. DetectText, AnalyzeDocument), and 'expense' for utility classes
 * wrapping AnalyzeExpense results.
 *
 * Re-exporting sub-modules is not ideal for performance, but we need to do it for in-browser IIFE
 * users (who'd otherwise not have any way to access the nested exported components).
 */

export * as api from "./api-models";
export {
  /**
   * @deprecated Please import direct from `api-models/response` (or use `trp.api.response` in IIFE)
   */
  ApiAnalyzeDocumentResponse,
  /**
   * @deprecated Please import direct from `api-models/response` (or use `trp.api.response` in IIFE)
   */
  ApiAnalyzeExpenseResponse,
  /**
   * @deprecated Please import direct from `api-models/response` (or use `trp.api.response` in IIFE)
   */
  ApiAnalyzeIdResponse,
  /**
   * @deprecated Please import direct from `api-models/response` (or use `trp.api.response` in IIFE)
   */
  ApiResponsePage,
  /**
   * @deprecated Please import direct from `api-models/response` (or use `trp.api.response` in IIFE)
   */
  ApiResponsePages,
} from "./api-models/response";

export * as base from "./base";
export {
  /**
   * @deprecated Please import direct from `base` submodule (or use `trp.base` in IIFE)
   */
  ApiBlockWrapper,
} from "./base";
export * as content from "./content";
export * as document from "./document";
export {
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  SelectionElement,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Word,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  HeuristicReadingOrderModelParams,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  HeaderFooterSegmentModelParams,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Page,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Line,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Field,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  FieldKey,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  FieldValue,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Form,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  QueryInstance,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  QueryInstanceCollection,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  QueryResult,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Cell,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  CellBase,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  MergedCell,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Row,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  Table,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  TextractDocument,
  /**
   * @deprecated Please import direct from `document` submodule (or use `trp.document` in IIFE)
   */
  FormsComposite,
} from "./document";

export * as expense from "./expense";
export {
  /**
   * @deprecated Please import direct from `expense` submodule (or use `trp.expense` in IIFE)
   */
  ExpenseComponentDetection,
  /**
   * @deprecated Please import direct from `expense` submodule (or use `trp.expense` in IIFE)
   */
  ExpenseFieldType,
  /**
   * @deprecated Please import direct from `expense` submodule (or use `trp.expense` in IIFE)
   */
  ExpenseField,
  /**
   * @deprecated Please import direct from `expense` submodule (or use `trp.expense` in IIFE)
   */
  ExpenseLineItem,
  /**
   * @deprecated Please import direct from `expense` submodule (or use `trp.expense` in IIFE)
   */
  ExpenseLineItemGroup,
  /**
   * @deprecated Please import direct from `expense` submodule (or use `trp.expense` in IIFE)
   */
  ExpenseDocument,
  /**
   * @deprecated Please import direct from `expense` submodule (or use `trp.expense` in IIFE)
   */
  TextractExpense,
} from "./expense";

export * as form from "./form";
export * as geometry from "./geometry";
export * as id from "./id";
export {
  /**
   * @deprecated Please import direct from `id` submodule (or use `trp.id` in IIFE)
   */
  IdFieldType,
  /**
   * @deprecated Please import direct from `id` submodule (or use `trp.id` in IIFE)
   */
  IdFieldValueType,
  /**
   * @deprecated Please import direct from `id` submodule (or use `trp.id` in IIFE)
   */
  IdDocumentType,
  /**
   * @deprecated Please import direct from `id` submodule (or use `trp.id` in IIFE)
   */
  IdDocumentField,
  /**
   * @deprecated Please import direct from `id` submodule (or use `trp.id` in IIFE)
   */
  IdDocument,
  /**
   * @deprecated Please import direct from `id` submodule (or use `trp.id` in IIFE)
   */
  TextractIdentity,
} from "./id";

export * as query from "./query";
export * as table from "./table";
