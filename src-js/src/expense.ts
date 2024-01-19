/**
 * TRP classes for expense API results (e.g. AnalyzeExpense)
 */

// Local Dependencies:
import {
  ApiExpenseComponentDetection,
  ApiExpenseDocument,
  ApiExpenseField,
  ApiExpenseFieldType,
  ApiExpenseLineItem,
  ApiExpenseLineItemGroup,
} from "./api-models/expense";
import { ApiAnalyzeExpenseResponse } from "./api-models/response";
import { ApiObjectWrapper, DocumentMetadata, getIterable } from "./base";
import { Geometry } from "./geometry";

export class ExpenseComponentDetection extends ApiObjectWrapper<ApiExpenseComponentDetection> {
  _geometry?: Geometry<ApiExpenseComponentDetection, ExpenseComponentDetection>;
  _parentField: ExpenseField;

  constructor(dict: ApiExpenseComponentDetection, parentField: ExpenseField) {
    super(dict);
    this._parentField = parentField;
    this._geometry = dict.Geometry ? new Geometry(dict.Geometry, this) : undefined;
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  /**
   * geometry may be undefined when no `text` is detected.
   */
  get geometry(): undefined | Geometry<ApiExpenseComponentDetection, ExpenseComponentDetection> {
    return this._geometry;
  }
  get parentField(): ExpenseField {
    return this._parentField;
  }
  get text(): string {
    return this._dict.Text;
  }
  set text(newVal: string) {
    this._dict.Text = newVal;
  }
}

export class ExpenseFieldType extends ApiObjectWrapper<ApiExpenseFieldType> {
  _parentField: ExpenseField;

  constructor(dict: ApiExpenseFieldType, parentField: ExpenseField) {
    super(dict);
    this._parentField = parentField;
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get parentField(): ExpenseField {
    return this._parentField;
  }
  get text(): string {
    return this._dict.Text;
  }
  set text(newVal: string) {
    this._dict.Text = newVal;
  }
}

export class ExpenseField extends ApiObjectWrapper<ApiExpenseField> {
  _fieldType: ExpenseFieldType;
  _label: ExpenseComponentDetection | null;
  _parent: ExpenseDocument | ExpenseLineItem;
  _value: ExpenseComponentDetection;

  constructor(dict: ApiExpenseField, parent: ExpenseDocument | ExpenseLineItem) {
    super(dict);
    this._parent = parent;
    this._fieldType = new ExpenseFieldType(dict.Type, this);
    this._label = dict.LabelDetection ? new ExpenseComponentDetection(dict.LabelDetection, this) : null;
    this._value = new ExpenseComponentDetection(dict.ValueDetection, this);
  }

  get fieldType(): ExpenseFieldType {
    return this._fieldType;
  }
  get label(): ExpenseComponentDetection | null {
    return this._label;
  }
  get pageNumber(): number {
    return this._dict.PageNumber;
  }
  get parent(): ExpenseDocument | ExpenseLineItem {
    return this._parent;
  }
  get value(): ExpenseComponentDetection {
    return this._value;
  }
}

export class ExpenseLineItem extends ApiObjectWrapper<ApiExpenseLineItem> {
  _fields: ExpenseField[];
  _parentGroup: ExpenseLineItemGroup;

  constructor(dict: ApiExpenseLineItem, parentGroup: ExpenseLineItemGroup) {
    super(dict);
    this._parentGroup = parentGroup;
    this._fields = (dict.LineItemExpenseFields || []).map((d) => new ExpenseField(d, this));
  }

  get nFields(): number {
    return this._fields.length;
  }
  get parentGroup(): ExpenseLineItemGroup {
    return this._parentGroup;
  }

  /**
   * Iterate through the fields in an expense line item
   * @example
   * for (const field of lineItem.iterFields()) {
   *   console.log(field.label.text);
   * }
   * @example
   * [...lineItem.iterFields()].forEach(
   *   (field) => console.log(field.label.text)
   * );
   */
  iterFields(): Iterable<ExpenseField> {
    return getIterable(() => this._fields);
  }

  listFields(): ExpenseField[] {
    return this._fields.slice();
  }

  getFieldByType(fieldType: string): ExpenseField | null {
    const results = this.searchFieldsByType(fieldType);
    return results.length ? results[0] : null;
  }

  searchFieldsByType(fieldType: string): ExpenseField[] {
    return this._fields.filter((f) => f.fieldType.text == fieldType);
  }
}

export class ExpenseLineItemGroup extends ApiObjectWrapper<ApiExpenseLineItemGroup> {
  _lineItems: ExpenseLineItem[];
  _parentDoc: ExpenseDocument;

  constructor(dict: ApiExpenseLineItemGroup, parentDoc: ExpenseDocument) {
    super(dict);
    this._parentDoc = parentDoc;
    this._lineItems = (dict.LineItems || []).map((d) => new ExpenseLineItem(d, this));
  }
  /**
   * ONE-BASED index of this line item group within the parent expense document.
   */
  get index(): number {
    return this._dict.LineItemGroupIndex;
  }
  get nLineItems(): number {
    return this._lineItems.length;
  }
  get parentDoc(): ExpenseDocument {
    return this._parentDoc;
  }

  /**
   * Iterate through the line items in the group
   * @example
   * for (const lineItem of group.iterLineItems()) {
   *   console.log(lineItem.nFields);
   * }
   * @example
   * [...group.iterLineItems()].forEach(
   *   (item) => console.log(item.nFields)
   * );
   */
  iterLineItems(): Iterable<ExpenseLineItem> {
    return getIterable(() => this._lineItems);
  }

  listLineItems(): ExpenseLineItem[] {
    return this._lineItems.slice();
  }
}

export class ExpenseDocument extends ApiObjectWrapper<ApiExpenseDocument> {
  _lineItemGroups: ExpenseLineItemGroup[];
  _parentExpense: TextractExpense | null;
  _summaryFields: ExpenseField[];

  constructor(dict: ApiExpenseDocument, parentExpense: TextractExpense | null = null) {
    super(dict);
    this._parentExpense = parentExpense;
    this._lineItemGroups = (dict.LineItemGroups || []).map((d) => new ExpenseLineItemGroup(d, this));
    this._summaryFields = (dict.SummaryFields || []).map((d) => new ExpenseField(d, this));
  }

  /**
   * ONE-BASED index of this expense document within the parent response object.
   */
  get index(): number {
    return this._dict.ExpenseIndex;
  }
  get nLineItemGroups(): number {
    return this._lineItemGroups.length;
  }
  get nSummaryFields(): number {
    return this._summaryFields.length;
  }
  get parentExpense(): TextractExpense | null {
    return this._parentExpense;
  }

  getSummaryFieldByType(fieldType: string): ExpenseField | null {
    const results = this.searchSummaryFieldsByType(fieldType);
    return results.length ? results[0] : null;
  }

  searchSummaryFieldsByType(fieldType: string): ExpenseField[] {
    return this._summaryFields.filter((f) => f.fieldType.text == fieldType);
  }

  /**
   * Iterate through the line item groups in the document
   * @example
   * for (const group of doc.iterLineItemGroups()) {
   *   console.log(group.nLineItems);
   * }
   * @example
   * [...doc.iterLineItemGroups()].forEach(
   *   (group) => console.log(group.nLineItems)
   * );
   */
  iterLineItemGroups(): Iterable<ExpenseLineItemGroup> {
    return getIterable(() => this._lineItemGroups);
  }

  /**
   * Iterate through the expense summary fields in the document
   * @example
   * for (const field of doc.iterSummaryFields()) {
   *   console.log(field.label.text);
   * }
   * @example
   * [...doc.iterSummaryFields()].forEach(
   *   (field) => console.log(field.label.text)
   * );
   */
  iterSummaryFields(): Iterable<ExpenseField> {
    return getIterable(() => this._summaryFields);
  }

  listLineItemGroups(): ExpenseLineItemGroup[] {
    return this._lineItemGroups.slice();
  }

  listSummaryFields(): ExpenseField[] {
    return this._summaryFields.slice();
  }
}

export class TextractExpense extends ApiObjectWrapper<ApiAnalyzeExpenseResponse> {
  _docs: ExpenseDocument[];
  _metadata: DocumentMetadata;

  constructor(textractResult: ApiAnalyzeExpenseResponse) {
    super(textractResult);

    if (!textractResult.ExpenseDocuments) {
      throw new Error(
        "Input doesn't seem like a Textract expense analysis result: missing property 'ExpenseDocuments'",
      );
    }

    this._metadata = new DocumentMetadata(textractResult.DocumentMetadata);
    this._docs = (textractResult.ExpenseDocuments || []).map((d) => new ExpenseDocument(d, this));
  }

  get metadata(): DocumentMetadata {
    return this._metadata;
  }
  get nDocs(): number {
    return this._docs.length;
  }

  /**
   * Iterate through the expense expense documents in the result
   * @example
   * for (const doc of expense.iterDocs()) {
   *   console.log(doc.nSummaryFields);
   * }
   * @example
   * [...expense.iterDocs()].forEach(
   *   (doc) => console.log(doc.nSummaryFields)
   * );
   */
  iterDocs(): Iterable<ExpenseDocument> {
    return getIterable(() => this._docs);
  }

  listDocs(): ExpenseDocument[] {
    return this._docs.slice();
  }
}
