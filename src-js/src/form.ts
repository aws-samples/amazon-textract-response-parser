/**
 * TRP classes for (generic document) key-value form objects
 */

// Local Dependencies:
import { ApiBlockType, ApiRelationshipType } from "./api-models/base";
import { ApiSelectionStatus } from "./api-models/content";
import { ApiKeyBlock, ApiKeyValueSetBlock, ApiValueBlock } from "./api-models/form";
import {
  aggregate,
  AggregationMethod,
  doesFilterAllowBlockType,
  escapeHtml,
  getIterable,
  IApiBlockWrapper,
  IBlockManager,
  IDocBlocks,
  indent,
  IRenderable,
  IRenderOpts,
  normalizeOptionalSet,
  PageHostedApiBlockWrapper,
} from "./base";
import { buildWithContent, IWithContent, SelectionElement, Signature, WithWords, Word } from "./content";
import { Geometry, IWithGeometry } from "./geometry";

/**
 * Generic base class for a FieldKey, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/FieldKey`.
 */
export class FieldKeyGeneric<TPage extends IBlockManager>
  extends WithWords(PageHostedApiBlockWrapper)<ApiKeyBlock | ApiKeyValueSetBlock, TPage>
  implements IRenderable, IWithGeometry<ApiKeyBlock | ApiKeyValueSetBlock, FieldKeyGeneric<TPage>>
{
  _geometry: Geometry<ApiKeyBlock | ApiKeyValueSetBlock, FieldKeyGeneric<TPage>>;
  _parentField: FieldGeneric<TPage>;

  constructor(block: ApiKeyBlock | ApiKeyValueSetBlock, parentField: FieldGeneric<TPage>) {
    super(block, parentField.parentPage);
    this._parentField = parentField;
    this._geometry = new Geometry(block.Geometry, this);
  }

  get geometry(): Geometry<ApiKeyBlock | ApiKeyValueSetBlock, FieldKeyGeneric<TPage>> {
    return this._geometry;
  }
  get parentField(): FieldGeneric<TPage> {
    return this._parentField;
  }

  /**
   * Structural (not text) confidence score of the key/value pair detection
   *
   * This score reflects the confidence of the model detecting the key-value relation. For the text
   * OCR confidence, see the `.getOcrConfidence()` method instead.
   */
  get confidence(): number {
    return this._dict.Confidence;
  }

  /**
   * Aggregate OCR confidence score of the text in this field key
   *
   * This score reflects the aggregated OCR confidence of the text detected in the field key. For
   * the model's confidence on the key/value relation itself, see `.confidence`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   * @returns Aggregated confidence, or null if this field key has no content/text
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number | null {
    return aggregate(
      this.listWords().map((w) => w.confidence),
      aggMethod,
    );
  }
  /**
   * The semantic `html()` representation of a field key is just the (HTML-escaped) text
   */
  html({ includeBlockTypes = null, skipBlockTypes = null }: IRenderOpts = {}): string {
    // WithWords.getText already filters by our self block type (KEY or KEY_VALUE_SET), but we'd
    // like to also support explicitly skipping by KEY even if our block is KEY_VALUE_SET:
    if (skipBlockTypes) {
      skipBlockTypes = normalizeOptionalSet(skipBlockTypes);
      if (skipBlockTypes.has(ApiBlockType.Key)) return "";
    }
    return escapeHtml(this.getText({ includeBlockTypes, skipBlockTypes }));
  }
  /**
   * The `str()` representation of a field key is just the contained text
   */
  str(): string {
    return this.text;
  }
}

/**
 * Generic base class for a FieldValue, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/FieldValue`.
 */
export class FieldValueGeneric<TPage extends IBlockManager>
  extends buildWithContent<SelectionElement | Signature | Word>()(PageHostedApiBlockWrapper)<
    ApiKeyValueSetBlock | ApiValueBlock,
    TPage
  >
  implements
    IRenderable,
    IWithContent<SelectionElement | Signature | Word>,
    IWithGeometry<ApiKeyValueSetBlock | ApiValueBlock, FieldValueGeneric<TPage>>
{
  _geometry: Geometry<ApiKeyValueSetBlock | ApiValueBlock, FieldValueGeneric<TPage>>;
  _parentField: FieldGeneric<TPage>;

  constructor(valueBlock: ApiKeyValueSetBlock | ApiValueBlock, parentField: FieldGeneric<TPage>) {
    super(valueBlock, parentField.parentPage);
    this._parentField = parentField;
    this._geometry = new Geometry(valueBlock.Geometry, this);
  }

  /**
   * Structural (not text) confidence score of the key/value pair detection
   *
   * This score reflects the confidence of the model detecting the key-value relation. For the text
   * OCR confidence, see the `.getOcrConfidence()` method instead.
   */
  get confidence(): number {
    return this._dict.Confidence;
  }
  get geometry(): Geometry<ApiKeyValueSetBlock | ApiValueBlock, FieldValueGeneric<TPage>> {
    return this._geometry;
  }
  /**
   * Selection status if field value is one SELECTION_ELEMENT, else null
   *
   * If the field value contains exactly one SELECTION_ELEMENT, this property returns `true` if
   * it's SELECTED or `false` if it's NOT_SELECTED. Otherwise, this property returns null.
   */
  get isSelected(): boolean | null {
    const selEls = this.listContent({
      includeBlockTypes: [ApiBlockType.SelectionElement],
    }) as SelectionElement[];
    return selEls.length === 1 ? selEls[0].selectionStatus === ApiSelectionStatus.Selected : null;
  }
  /**
   * A field value is a "selection" if it contains one SELECTION_ELEMENT
   *
   * Use this to check whether this field value is a checkbox/radio button/etc. Other (text)
   * content may also be present.
   */
  get isSelection(): boolean {
    return this.listContent({ includeBlockTypes: [ApiBlockType.SelectionElement] }).length == 1;
  }
  get parentField(): FieldGeneric<TPage> {
    return this._parentField;
  }
  /**
   * Selection status if field value is one SELECTION_ELEMENT, else null
   *
   * If the field value contains exactly one SELECTION_ELEMENT, this property returns its
   * SelectionStatus. Otherwise, null.
   */
  get selectionStatus(): ApiSelectionStatus | null {
    const selEls = this.listContent({
      includeBlockTypes: [ApiBlockType.SelectionElement],
    }) as SelectionElement[];
    return selEls.length === 1 ? selEls[0].selectionStatus : null;
  }

  /**
   * Aggregate OCR confidence score of the text in this field value
   *
   * This score reflects the aggregated OCR confidence of the text detected in the field value. For
   * the model's confidence on the key/value relation itself, see `.confidence`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   * @returns Aggregated confidence, or null if this field value has no content/text
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number | null {
    return aggregate(
      this.listContent().map((c) => c.confidence),
      aggMethod,
    );
  }
  /**
   * The semantic `html()` representation of a field value is just the (HTML-escaped) text
   */
  html({ includeBlockTypes = null, skipBlockTypes = null }: IRenderOpts = {}): string {
    // WithContent.getText already filters by our self block type (KEY or KEY_VALUE_SET), but we'd
    // like to also support explicitly skipping by VALUE even if our block is KEY_VALUE_SET:
    if (skipBlockTypes) {
      skipBlockTypes = normalizeOptionalSet(skipBlockTypes);
      if (skipBlockTypes.has(ApiBlockType.Value)) return "";
    }
    return escapeHtml(this.getText({ includeBlockTypes, skipBlockTypes }));
  }
  /**
   * The `str()` representation of a field value is just the contained text
   */
  str(): string {
    return this.text;
  }
}

/**
 * Generic base class for a Field, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/Field`.
 *
 * TODO: We should probably do away with FieldKeyGeneric and just use this class?
 * Then it could directly wrap underlying objects
 */
export class FieldGeneric<TPage extends IBlockManager>
  implements IApiBlockWrapper<ApiKeyBlock | ApiKeyValueSetBlock>, IRenderable
{
  _key: FieldKeyGeneric<TPage>;
  _parentForm: FormGeneric<TPage>;
  _value: FieldValueGeneric<TPage> | null;

  constructor(keyBlock: ApiKeyBlock | ApiKeyValueSetBlock, parentForm: FormGeneric<TPage>) {
    this._parentForm = parentForm;
    this._value = null;

    this._key = new FieldKeyGeneric(keyBlock, this);

    let valueBlockIds: string[] = [];
    (keyBlock.Relationships || []).forEach((rs) => {
      if (rs.Type == ApiRelationshipType.Value) {
        valueBlockIds = valueBlockIds.concat(rs.Ids);
      }
    });

    if (valueBlockIds.length > 1) {
      const fieldLogName = this._key ? `field '${this._key.text}'` : "unnamed form field";
      console.warn(
        `Got ${valueBlockIds.length} value blocks for ${fieldLogName} (Expected 0-1). Including first only.`,
      );
    }
    if (valueBlockIds.length) {
      const valBlockId = valueBlockIds[0];
      const valBlock = parentForm.parentPage.getBlockById(valBlockId);
      if (!valBlock) {
        console.warn(
          `Document missing child block ${valBlockId} referenced by value for field key ${this.key.id}`,
        );
      } else {
        this._value = new FieldValueGeneric(valBlock as ApiKeyValueSetBlock | ApiValueBlock, this);
      }
    }
  }

  get blockType(): ApiBlockType {
    // Hoisting required property from key to implement IApiBlockWrapper
    return this._key.blockType;
  }
  /**
   * Overall structural (not text) confidence score of the key/value pair detection
   *
   * Note this score describes the model's confidence in the validity of the key-value pair, not
   * the underlying OCR confidence of the text. (For that, see `.getOcrConfidence()` instead)
   *
   * Returns the average structure confidence over whichever of {key} and {value} are present.
   */
  get confidence(): number {
    const scores = [];
    if (this._key) {
      scores.push(this._key.confidence || 0);
    }
    if (this._value) {
      scores.push(this._value.confidence || 0);
    }
    if (scores.length) {
      return scores.reduce((acc, next) => acc + next, 0) / scores.length;
    } else {
      return 0;
    }
  }
  get childBlockIds(): string[] {
    // Hoisting required property from key to implement IApiBlockWrapper
    return this._key.childBlockIds;
  }
  get dict(): ApiKeyBlock | ApiKeyValueSetBlock {
    // Hoisting required property from key to implement IApiBlockWrapper
    return this._key.dict;
  }
  get id(): string {
    // Hoisting required property from key to implement IApiBlockWrapper
    return this._key.id;
  }
  /**
   * Selection status if field value is one SELECTION_ELEMENT, else null
   *
   * If the field value contains exactly one SELECTION_ELEMENT, this property returns `true` if
   * it's SELECTED or `false` if it's NOT_SELECTED. Otherwise, this property returns null.
   */
  get isSelected(): boolean | null {
    return this.value ? this.value.isSelected : null;
  }
  /**
   * A field is a "selection" if its .value contains one SELECTION_ELEMENT
   *
   * Use this to check whether this is a checkbox/radio button/etc field. Other (text) content may
   * also be present.
   */
  get isSelection(): boolean {
    return !!this.value?.isSelection;
  }
  get key(): FieldKeyGeneric<TPage> {
    return this._key;
  }
  get parentForm(): FormGeneric<TPage> {
    return this._parentForm;
  }
  get parentPage(): TPage {
    return this._parentForm.parentPage;
  }
  /**
   * Selection status if field value is one SELECTION_ELEMENT, else null
   *
   * If the field value contains exactly one SELECTION_ELEMENT, this property returns its
   * SelectionStatus. Otherwise, null.
   */
  get selectionStatus(): ApiSelectionStatus | null {
    return this.value ? this.value.selectionStatus : null;
  }
  get text(): string {
    return `${this._key.text}: ${this._value?.text || ""}`;
  }
  get value(): FieldValueGeneric<TPage> | null {
    return this._value;
  }

  /**
   * Aggregate OCR confidence score of the text in this field key and value (whichever are present)
   *
   * This score reflects the aggregated OCR confidence of all the text content detected in the
   * field key and/or value (whichever of the two are present). For the model's confidence on the
   * key/value relation itself, see `.confidence`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   * @returns Aggregated confidence, or null if this field has no content/text
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number | null {
    const keyValContent = (this._value ? this._value.listContent() : []).concat(this._key.listWords());
    return aggregate(
      keyValContent.map((c) => c.confidence),
      aggMethod,
    );
  }

  relatedBlockIdsByRelType(relType: ApiRelationshipType | ApiRelationshipType[]): string[] {
    // Hoisting required property from key to implement IApiBlockWrapper
    return this._key.relatedBlockIdsByRelType(relType);
  }

  /**
   * The semantic `html()` representation of a form field uses an `<input>` element
   *
   * We render a text field, but `disable` it to prevent accidental edits when viewing reports
   */
  html(opts?: IRenderOpts): string {
    let renderKey = doesFilterAllowBlockType(opts, this.key.blockType);
    let renderValue = this.value && doesFilterAllowBlockType(opts, this.value.blockType);
    if (opts && opts.skipBlockTypes) {
      const skipSpec = normalizeOptionalSet(opts.skipBlockTypes);
      if (skipSpec.has(ApiBlockType.Key)) renderKey = false;
      if (skipSpec.has(ApiBlockType.Value)) renderValue = false;
    }
    if (!renderKey && !renderValue) return "";

    const keyPartial = renderKey ? ` label="${escapeHtml(this._key.getText(opts), { forAttr: true })}"` : "";
    const valPartial = renderValue
      ? ` value="${escapeHtml(this.value ? this.value.getText(opts) : "", { forAttr: true })}"`
      : "";
    // TODO: Checkbox type for selector fields?
    return `<input${keyPartial} type="text" disabled${valPartial} />`;
  }

  str(): string {
    // TODO: Probably we can do away with `._key?` checks as it should always be set per type moel?
    return `\nField\n==========\nKey: ${this._key ? this._key.str() : ""}\nValue: ${
      this._value ? this._value.str() : ""
    }`;
  }
}

/**
 * Generic class for a Form, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/Form`.
 */
export class FormGeneric<TPage extends IBlockManager> implements IRenderable {
  _fields: FieldGeneric<TPage>[];
  _fieldsMap: { [keyText: string]: FieldGeneric<TPage> };
  _parentPage: TPage;

  constructor(keyBlocks: Array<ApiKeyBlock | ApiKeyValueSetBlock>, parentPage: TPage) {
    this._fields = [];
    this._fieldsMap = {};
    this._parentPage = parentPage;

    keyBlocks.forEach((keyBlock) => {
      const f = new FieldGeneric(keyBlock, this);
      this._fields.push(f);
      const fieldKeyText = f.key.text || "";
      if (fieldKeyText) {
        if (fieldKeyText in this._fieldsMap) {
          if (f.confidence > this._fieldsMap[fieldKeyText].confidence) {
            this._fieldsMap[fieldKeyText] = f;
          }
        } else {
          this._fieldsMap[fieldKeyText] = f;
        }
      }
    });
  }

  get nFields(): number {
    return this._fields.length;
  }
  get parentPage(): TPage {
    return this._parentPage;
  }
  get text(): string {
    return this.listFields()
      .map((f) => f.text)
      .join("\n");
  }

  getFieldByKey(key: string): FieldGeneric<TPage> | null {
    return this._fieldsMap[key] || null;
  }

  /**
   * The semantic `html()` representation of a Form field collection uses a `<form>` element
   *
   * Within the `<form>`, we list out all the individual fields
   */
  html(opts: IRenderOpts = {}): string {
    const fieldHtmls = this.listFields()
      .map((f) => f.html(opts))
      .filter((s) => s);
    return fieldHtmls.length ? `<form>\n${indent(fieldHtmls.join("\n"))}\n</form>` : "<form></form>";
  }

  /**
   * Iterate through the Fields in the Form.
   * @param skipFieldsWithoutKey Set `true` to skip fields with no field.key (Included by default)
   * @example
   * for (const field of form.iterFields()) {
   *   console.log(field?.key.text);
   * }
   * @example
   * const fields = [...form.iterFields()];
   */
  iterFields(skipFieldsWithoutKey = false): Iterable<FieldGeneric<TPage>> {
    return getIterable(() => this.listFields(skipFieldsWithoutKey));
  }

  /**
   * List the Fields in the Form.
   * @param skipFieldsWithoutKey Set `true` to skip fields with no field.key (Included by default)
   */
  listFields(skipFieldsWithoutKey = false): FieldGeneric<TPage>[] {
    return skipFieldsWithoutKey ? this._fields.filter((f) => f.key) : this._fields.slice();
  }

  /**
   * List the Fields in the Form with key text containing (case-insensitive) `key`
   * @param key The text to search for in field keys
   */
  searchFieldsByKey(key: string): FieldGeneric<TPage>[] {
    const searchKey = key.toLowerCase();
    return this._fields.filter((field) => field.key && field.key.text.toLowerCase().indexOf(searchKey) >= 0);
  }

  str(): string {
    return this._fields.map((f) => f.str()).join("\n");
  }
}

/**
 * Generic base class for a composite of multiple Forms, as Page and TextractDocument are not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/FormsComposite`.
 *
 * While a Form is associated with a particular page, the FormsComposite class exposes a similar interface
 * for querying detected fields across all pages of the document at once. In general, results are analyzed
 * and presented in page order.
 */
export class FormsCompositeGeneric<TPage extends IBlockManager, TDocument extends IDocBlocks>
  implements IRenderable
{
  _forms: FormGeneric<TPage>[];
  _parentDocument: TDocument;

  constructor(forms: FormGeneric<TPage>[], parentDocument: TDocument) {
    this._forms = forms;
    this._parentDocument = parentDocument;
  }

  get nFields(): number {
    return this._forms.reduce((acc, next) => acc + next.nFields, 0);
  }
  get parentDocument(): TDocument {
    return this._parentDocument;
  }
  get text(): string {
    return this._forms.map((f) => f.text).join("\n\n");
  }

  getFieldByKey(key: string): FieldGeneric<TPage> | null {
    for (const form of this._forms) {
      const result = form.getFieldByKey(key);
      if (result) return result;
    }
    return null;
  }

  /**
   * The semantic `html()` for a composite form uses a `<div>` of class "form-page"
   *
   * Within the container, we render the representation of each page's separate `<form>`.
   */
  html(): string {
    const pageHtmls = this._forms.map(
      (form, ixForm) =>
        `<div class="form-page" id="form-page-${ixForm}">\n${indent(
          form
            .listFields()
            .map((f) => `${f.html()}\n`) // Ensure a trailing newline
            .join(""),
        )}</div>\n`, // Ensure a trailing newline
    );
    return `<form>\n${indent(pageHtmls.join(""))}</form>`;
  }

  /**
   * Iterate through the Fields in all Forms.
   * @param skipFieldsWithoutKey Set `true` to skip fields with no field.key (Included by default)
   * @example
   * for (const field of form.iterFields()) {
   *   console.log(field?.key.text);
   * }
   * @example
   * const fields = [...form.iterFields()];
   */
  iterFields(skipFieldsWithoutKey = false): Iterable<FieldGeneric<TPage>> {
    return getIterable(() => this.listFields(skipFieldsWithoutKey));
  }

  /**
   * List the Fields in all Forms.
   * @param skipFieldsWithoutKey Set `true` to skip fields with no field.key (Included by default)
   */
  listFields(skipFieldsWithoutKey = false): FieldGeneric<TPage>[] {
    const allFields = ([] as FieldGeneric<TPage>[]).concat(...this._forms.map((form) => form.listFields()));
    if (skipFieldsWithoutKey) {
      return allFields.filter((f) => f.key);
    } else {
      return allFields;
    }
  }

  /**
   * List the Fields in the Form with key text containing (case-insensitive) `key`
   * @param key The text to search for in field keys
   */
  searchFieldsByKey(key: string): FieldGeneric<TPage>[] {
    return ([] as FieldGeneric<TPage>[]).concat(...this._forms.map((f) => f.searchFieldsByKey(key)));
  }

  str(): string {
    return this._forms.map((f) => f.str()).join("\n");
  }
}

/**
 * Interface for a (`Page`-like) object that exposes page-level form data
 */
export interface IWithForm<TPage extends IBlockManager> {
  /**
   * Parsed Forms (key-value pairs) data
   */
  form: FormGeneric<TPage>;
}

/**
 * Interface for a (`TextractDocument`-like) object that exposes document-level composite form data
 */
export interface IWithFormsComposite<TPage extends IBlockManager, TDocument extends IDocBlocks> {
  /**
   * Parsed Forms (key-value pairs) data
   */
  form: FormsCompositeGeneric<TPage, TDocument>;
}
