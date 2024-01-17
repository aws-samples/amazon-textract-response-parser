/**
 * Identity document analysis Textract API models used by the Textract Response Parser.
 *
 * This file collects types/interfaces specific to Textract's ID analysis APIs
 */

export interface ApiIdentityDocumentFieldType {
  /**
   * 0-100 confidence score of the detected text
   */
  Confidence: number;
  /**
   * Theoretically possible per the API docs but I haven't seen this in practice so far.
   */
  NormalizedValue?: {
    Value: string;
    ValueType: string;
  };
  Text: string;
}

export interface ApiIdentityDocumentFieldValueDetection {
  /**
   * 0-100 confidence score for the detected value text
   */
  Confidence: number;
  /**
   * Only "DATE" ("yy-MM-ddThh:mm:ss") type is mentioned per the API doc
   *
   * https://docs.aws.amazon.com/textract/latest/dg/API_NormalizedValue.html
   */
  NormalizedValue?: {
    Value: string;
    ValueType: string;
  };
  Text: string;
}

export interface ApiIdentityDocumentField {
  Type: ApiIdentityDocumentFieldType;
  ValueDetection: ApiIdentityDocumentFieldValueDetection;
}

export interface ApiIdentityDocument {
  readonly DocumentIndex: number;
  IdentityDocumentFields: ApiIdentityDocumentField[];
}
