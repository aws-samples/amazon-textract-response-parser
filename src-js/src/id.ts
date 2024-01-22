/**
 * TRP classes for identity document API results (e.g. AnalyzeID)
 */

// Local Dependencies:
import { ApiIdentityDocument, ApiIdentityDocumentField } from "./api-models/id";
import { ApiAnalyzeIdResponse } from "./api-models/response";
import { ApiObjectWrapper, getIterable } from "./base";

/**
 * Enum of Textract identity document field types recognised by TRP.js
 *
 * Any unrecognised types will be mapped to `Other`.
 *
 * https://docs.aws.amazon.com/textract/latest/dg/identitydocumentfields.html
 */
export enum IdFieldType {
  FirstName = "FIRST_NAME",
  LastName = "LAST_NAME",
  MiddleName = "MIDDLE_NAME",
  Suffix = "SUFFIX",
  AddressCity = "CITY_IN_ADDRESS",
  AddressZipCode = "ZIP_CODE_IN_ADDRESS",
  AddressState = "STATE_IN_ADDRESS",
  StateName = "STATE_NAME",
  DocumentNumber = "DOCUMENT_NUMBER",
  ExpirationDate = "EXPIRATION_DATE",
  DateOfBirth = "DATE_OF_BIRTH",
  DateOfIssue = "DATE_OF_ISSUE",
  IdType = "ID_TYPE",
  Endorsements = "ENDORSEMENTS",
  Veteran = "VETERAN",
  Restrictions = "RESTRICTIONS",
  Class = "CLASS",
  Address = "ADDRESS",
  County = "COUNTY",
  PlaceOfBirth = "PLACE_OF_BIRTH",
  Other = "OTHER",
}

/**
 * Enum of Textract identity document field *data* types recognised by TRP.js
 *
 * This refers to the actual data type of the value (e.g. date vs other) rather than the field type (e.g.
 * expiration date vs date of issue).
 *
 * https://docs.aws.amazon.com/textract/latest/dg/identitydocumentfields.html
 */
export const enum IdFieldValueType {
  Date = "DATE",
  Other = "OTHER",
}

/**
 * Enum of TRP-recognised ID document types (known values for ID_TYPE fields)
 */
export enum IdDocumentType {
  DrivingLicense = "DRIVER LICENSE FRONT",
  Passport = "PASSPORT",
  Other = "OTHER",
}

export class IdDocumentField extends ApiObjectWrapper<ApiIdentityDocumentField> {
  _parentDocument?: IdDocument;

  constructor(dict: ApiIdentityDocumentField, parentDocument: IdDocument | undefined = undefined) {
    super(dict);
    this._parentDocument = parentDocument;
  }

  get isValueNormalized(): boolean {
    return typeof this._dict.ValueDetection?.NormalizedValue?.Value !== "undefined";
  }
  /**
   * Raw "field type" from Amazon Textract
   */
  get fieldTypeRaw(): string | undefined {
    return this._dict.Type?.Text;
  }
  /**
   * TRP-normalized "field type"
   */
  get fieldType(): IdFieldType {
    const typeDict = this._dict.Type;
    const textractFieldType = (typeDict?.NormalizedValue?.Value || typeDict?.Text || "").toUpperCase();

    if (Object.values(IdFieldType).some((t: string) => t === textractFieldType)) {
      return <IdFieldType>textractFieldType;
    } else {
      return IdFieldType.Other;
    }
  }
  /**
   * Identity document to which this field object belongs
   */
  get parentDocument(): IdDocument | undefined {
    return this._parentDocument;
  }
  /**
   * Value of the field, normalized if applicable
   */
  get value(): string {
    const detection = this._dict.ValueDetection;
    return detection?.NormalizedValue?.Value || detection?.Text || "";
  }
  get valueConfidence(): number {
    return this._dict.ValueDetection?.Confidence || 0;
  }
  /**
   * Raw value of the field without any normalization
   */
  get valueRaw(): string | undefined {
    return this._dict.ValueDetection?.Text;
  }
  /**
   * TRP-normalized data "type" for this field
   */
  get valueType(): IdFieldValueType {
    let rawValueType = this._dict.ValueDetection?.NormalizedValue?.ValueType;
    if (rawValueType) rawValueType = rawValueType.toUpperCase();
    if (rawValueType === "DATE") {
      return IdFieldValueType.Date;
    } else {
      return IdFieldValueType.Other;
    }
  }

  /**
   * Produce a human-readable string representation of this detected field
   */
  str(): string {
    return `${this.fieldType}: ${this.value} (${this.valueConfidence.toFixed(1)}% Confidence)`;
  }
}

/**
 * Parsed TRP object for a single identity document in an identity analysis result
 *
 * You'll usually create this via a `TextractIdentity`, rather than directly.
 */
export class IdDocument extends ApiObjectWrapper<ApiIdentityDocument> {
  _fields: IdDocumentField[];
  _fieldsByNormalizedType: { [key in IdFieldType]?: IdDocumentField };
  _parentResult?: TextractIdentity;

  constructor(dict: ApiIdentityDocument, parentResult: TextractIdentity | undefined = undefined) {
    super(dict);
    this._parentResult = parentResult;
    this._fields = (dict.IdentityDocumentFields || []).map((d) => new IdDocumentField(d, this));

    this._fieldsByNormalizedType = {};
    this._fields.forEach((field) => {
      this._fieldsByNormalizedType[field.fieldType] = field;
    });
  }

  get index(): number {
    return this._dict.DocumentIndex;
  }

  /**
   * Detected type of this identity document
   */
  get idType(): IdDocumentType {
    const idTypeValue = this.getFieldByType(IdFieldType.IdType)?.value;
    if (Object.values(IdDocumentType).some((t: string) => t === idTypeValue)) {
      return <IdDocumentType>idTypeValue;
    } else {
      return IdDocumentType.Other;
    }
  }
  get nFields(): number {
    return this._fields.length;
  }
  /**
   * Parent API result this document belongs to
   */
  get parentCollection(): TextractIdentity | undefined {
    return this._parentResult;
  }

  getFieldByType(fieldType: IdFieldType): IdDocumentField | undefined {
    return this._fieldsByNormalizedType[fieldType];
  }

  /**
   * Iterate through the detected fields in this identity document
   * @param skipFieldsWithoutKey Set `true` to skip fields with no field.key (Included by default)
   * @example
   * for (const idDoc of result.iterDocuments()) {
   *   console.log(idDoc.nFields);
   * }
   * @example
   * const idDocs = [...result.iterDocuments()];
   */
  iterFields(): Iterable<IdDocumentField> {
    return getIterable(() => this.listFields());
  }

  /**
   * List the detected fields in this identity document
   */
  listFields(): IdDocumentField[] {
    return this._fields.slice();
  }

  /**
   * Produce a human-readable string representation of the ID document
   */
  str(): string {
    const fldStr = this._fields.map((f) => f.str()).join("\n");
    return `==========\nIdentity Document ${this.index} (${this.idType})\n----------\n${fldStr}\n==========`;
  }
}

/**
 * Main TRP class to parse and analyze Amazon Textract identity analysis results
 *
 * Contains a list of (potentially multiple separate) detected identity documents from the
 * submitted content
 */
export class TextractIdentity extends ApiObjectWrapper<ApiAnalyzeIdResponse> {
  _documents: IdDocument[];

  /**
   * Create (parse) a TextractIdentity object from Amazon Textract identity analysis result JSON
   * @param textractResult Response JSON from identity analysis API
   */
  constructor(dict: ApiAnalyzeIdResponse) {
    super(dict);
    this._documents = (dict.IdentityDocuments || []).map((docDict) => new IdDocument(docDict, this));
  }

  get modelVersion(): string {
    return this._dict.AnalyzeIDModelVersion;
  }

  /**
   * Number of identity documents in this API result
   */
  get nDocuments(): number {
    return this._documents.length;
  }

  get nPages(): number {
    return this._dict.DocumentMetadata?.Pages || 0;
  }

  /**
   * Get a particular identity document from the result by (0-based) index
   * @throws Error if index is out of bounds 0 <= index < nDocuments
   */
  getDocAtIndex(index: number): IdDocument {
    if (!(index >= 0 && index < this._documents.length)) {
      throw new Error(`Document index ${index} must be between 0 and ${this._documents.length}`);
    }
    return this._documents[index];
  }

  /**
   * Iterate through the identity documents in the result
   * @param skipFieldsWithoutKey Set `true` to skip fields with no field.key (Included by default)
   * @example
   * for (const idDoc of result.iterDocuments()) {
   *   console.log(idDoc.nFields);
   * }
   * @example
   * const idDocs = [...result.iterDocuments()];
   */
  iterDocuments(): Iterable<IdDocument> {
    return getIterable(() => this.listDocuments());
  }

  /**
   * List the identity documents in the result
   */
  listDocuments(): IdDocument[] {
    return this._documents.slice();
  }

  /**
   * Produce a human-readable string representation of the AnalyzeId response
   */
  str(): string {
    return this._documents.map((d) => d.str()).join("\n\n");
  }
}
