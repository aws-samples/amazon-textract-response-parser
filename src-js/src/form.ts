/**
 * TRP classes for (generic document) key-value form objects
 */

// Local Dependencies:
import { ApiBlockType, ApiKeyValueSetBlock, ApiRelationshipType } from "./api-models/document";
import { ApiBlockWrapper, getIterable, WithParentDocBlocks } from "./base";
import { SelectionElement, Word, WithWords } from "./content";
import { Geometry } from "./geometry";

/**
 * Generic base class for a FieldKey, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/FieldKey`.
 */
export class FieldKeyGeneric<TPage extends WithParentDocBlocks> extends WithWords(
  ApiBlockWrapper
)<ApiKeyValueSetBlock> {
  _geometry: Geometry<ApiKeyValueSetBlock, FieldKeyGeneric<TPage>>;
  _parentField: FieldGeneric<TPage>;

  constructor(block: ApiKeyValueSetBlock, parentField: FieldGeneric<TPage>) {
    super(block);
    this._parentField = parentField;
    this._words = [];
    this._geometry = new Geometry(block.Geometry, this);

    let childIds: string[] = [];
    (block.Relationships || []).forEach((rs) => {
      if (rs.Type == ApiRelationshipType.Child) {
        childIds = childIds.concat(rs.Ids);
      }
    });

    const parentDocument = parentField.parentForm.parentPage.parentDocument;
    childIds
      .map((id) => {
        const block = parentDocument.getBlockById(id);
        if (!block) {
          console.warn(`Document missing child block ${id} referenced by field key ${this.id}`);
        }
        return block;
      })
      .forEach((block) => {
        if (!block) return; // Already logged warning above
        if (block.BlockType == ApiBlockType.Word) {
          this._words.push(new Word(block));
        }
      });
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  get geometry(): Geometry<ApiKeyValueSetBlock, FieldKeyGeneric<TPage>> {
    return this._geometry;
  }
  get parentField(): FieldGeneric<TPage> {
    return this._parentField;
  }
  get text(): string {
    return this._words.map((w) => w.text).join(" ");
  }

  str(): string {
    return this.text;
  }
}

/**
 * Generic base class for a FieldValue, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/FieldValue`.
 */
export class FieldValueGeneric<
  TPage extends WithParentDocBlocks
> extends ApiBlockWrapper<ApiKeyValueSetBlock> {
  _content: Array<SelectionElement | Word>;
  _geometry: Geometry<ApiKeyValueSetBlock, FieldValueGeneric<TPage>>;
  _parentField: FieldGeneric<TPage>;

  constructor(valueBlock: ApiKeyValueSetBlock, parentField: FieldGeneric<TPage>) {
    super(valueBlock);
    this._content = [];
    this._parentField = parentField;
    this._geometry = new Geometry(valueBlock.Geometry, this);

    let childIds: string[] = [];
    (valueBlock.Relationships || []).forEach((rs) => {
      if (rs.Type == ApiRelationshipType.Child) {
        childIds = childIds.concat(rs.Ids);
      }
    });

    const parentDocument = parentField.parentForm.parentPage.parentDocument;
    childIds
      .map((id) => {
        const block = parentDocument.getBlockById(id);
        if (!block) {
          console.warn(`Document missing child block ${id} referenced by field value ${this.id}`);
        }
        return block;
      })
      .forEach((block) => {
        if (!block) return; // Already logged warning above
        if (block.BlockType == ApiBlockType.Word) {
          this._content.push(new Word(block));
        } else if (block.BlockType == ApiBlockType.SelectionElement) {
          this._content.push(new SelectionElement(block));
        }
      });
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  get geometry(): Geometry<ApiKeyValueSetBlock, FieldValueGeneric<TPage>> {
    return this._geometry;
  }
  get parentField(): FieldGeneric<TPage> {
    return this._parentField;
  }
  get text(): string {
    return this._content.map((c) => ("selectionStatus" in c ? c.selectionStatus : c.text)).join(" ");
  }

  listContent(): Array<SelectionElement | Word> {
    return this._content.slice();
  }
  str(): string {
    return this.text;
  }
}

/**
 * Generic base class for a Field, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/Field`.
 */
export class FieldGeneric<TPage extends WithParentDocBlocks> {
  _key: FieldKeyGeneric<TPage>;
  _parentForm: FormGeneric<TPage>;
  _value: FieldValueGeneric<TPage> | null;

  constructor(keyBlock: ApiKeyValueSetBlock, parentForm: FormGeneric<TPage>) {
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
        `Got ${valueBlockIds.length} value blocks for ${fieldLogName} (Expected 0-1). Including first only.`
      );
    }
    if (valueBlockIds.length) {
      const parentDocument = parentForm.parentPage.parentDocument;
      const valBlockId = valueBlockIds[0];
      const valBlock = parentDocument.getBlockById(valBlockId);
      if (!valBlock) {
        console.warn(
          `Document missing child block ${valBlockId} referenced by value for field key ${this.key.id}`
        );
      } else {
        this._value = new FieldValueGeneric(valBlock as ApiKeyValueSetBlock, this);
      }
    }
  }

  /**
   * Return average confidence over whichever of {key, value} are present.
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
  get key(): FieldKeyGeneric<TPage> {
    return this._key;
  }
  get parentForm(): FormGeneric<TPage> {
    return this._parentForm;
  }
  get value(): FieldValueGeneric<TPage> | null {
    return this._value;
  }

  str(): string {
    return `\nField\n==========\nKey: ${this._key ? this._key.str() : ""}\nValue: ${
      this._value ? this._value.str() : ""
    }`;
  }
}

/**
 * Generic base class for a Form, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/Form`.
 */
export class FormGeneric<TPage extends WithParentDocBlocks> {
  _fields: FieldGeneric<TPage>[];
  _fieldsMap: { [keyText: string]: FieldGeneric<TPage> };
  _parentPage: TPage;

  constructor(keyBlocks: ApiKeyValueSetBlock[], parentPage: TPage) {
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

  getFieldByKey(key: string): FieldGeneric<TPage> | null {
    return this._fieldsMap[key] || null;
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
