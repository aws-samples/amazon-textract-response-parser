/**
 * Expense analysis Textract API models used by the Textract response parser.
 *
 * This file collects types/interfaces specific to Textract's expense/invoice/receipt analysis APIs
 * as per https://docs.aws.amazon.com/textract/latest/dg/invoices-receipts.html
 */

// Local Dependencies:
import { ApiGeometry } from "./geometry";

export interface ApiExpenseComponentDetection {
  Confidence: number;
  /**
   * Geometry may be absent if 'Text' is "".
   */
  Geometry?: ApiGeometry;
  Text: string;
}

export interface ApiExpenseFieldType {
  Confidence: number;
  Text: string;
}

export interface ApiExpenseField {
  LabelDetection?: ApiExpenseComponentDetection;
  PageNumber: number;
  Type: ApiExpenseFieldType;
  ValueDetection: ApiExpenseComponentDetection;
}

export interface ApiExpenseLineItem {
  LineItemExpenseFields: ApiExpenseField[];
}

export interface ApiExpenseLineItemGroup {
  readonly LineItemGroupIndex: number;
  LineItems: ApiExpenseLineItem[];
}

export interface ApiExpenseDocument {
  readonly ExpenseIndex: number;
  LineItemGroups: ApiExpenseLineItemGroup[];
  SummaryFields: ApiExpenseField[];
}
