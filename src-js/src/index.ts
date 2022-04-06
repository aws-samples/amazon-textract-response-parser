/**
 * Amazon Textract Response Parser (JS/TS) main entry point
 *
 * See 'api-models' for underlying API data types, 'document' for utility classes wrapping standard
 * document analysis/OCR jobs (e.g. DetectText, AnalyzeDocument), and 'expense' for utility classes
 * wrapping AnalyzeExpense results.
 */

export * from "./document";
export * from "./expense";

// Re-export the API types that users will most likely need to reference (for inputs):
export {
  ApiAnalyzeDocumentResponse,
  ApiAnalyzeExpenseResponse,
  ApiResponsePage,
  ApiResponsePages,
} from "./api-models";
