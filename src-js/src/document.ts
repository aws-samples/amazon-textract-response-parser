/**
 * TRP classes for standard document/OCR results (e.g. DetectText and AnalyzeDocument)
 */

// Local Dependencies:
import {
  ApiBlock,
  ApiBlockType,
  ApiCellBlock,
  ApiKeyValueEntityType,
  ApiKeyValueSetBlock,
  ApiLineBlock,
  ApiMergedCellBlock,
  ApiPageBlock,
  ApiRelationshipType,
  ApiSelectionElementBlock,
  ApiSelectionStatus,
  ApiTableBlock,
  ApiTextType,
  ApiWordBlock,
} from "./api-models/document";
import {
  ApiDocumentMetadata,
  ApiResponsePage,
  ApiResponsePages,
  ApiResponseWithContent,
  ApiResultWarning,
} from "./api-models/response";
import { ApiObjectWrapper, getIterable, modalAvg } from "./base";
import { BoundingBox, Geometry } from "./geometry";

export class ApiBlockWrapper<T extends ApiBlock> extends ApiObjectWrapper<T> {
  get id(): string {
    return this._dict.Id;
  }

  get blockType(): ApiBlockType {
    return this._dict.BlockType;
  }
}

// Simple constructor type for TS mixin pattern
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T;

export class Word extends ApiBlockWrapper<ApiWordBlock> {
  _geometry: Geometry<ApiWordBlock, Word>;

  constructor(block: ApiWordBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiWordBlock, Word> {
    return this._geometry;
  }
  get text(): string {
    return this._dict.Text;
  }
  get textType(): ApiTextType {
    return this._dict.TextType;
  }
  set textType(newVal: ApiTextType) {
    this._dict.TextType = newVal;
  }

  str(): string {
    return this.text;
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
function WithWords<T extends Constructor<{}>>(SuperClass: T) {
  return class extends SuperClass {
    _words: Word[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      this._words = [];
    }

    get nWords(): number {
      return this._words.length;
    }

    /**
     * Iterate through the Words in this object
     * @example
     * for (const word of line.iterWords) {
     *   console.log(word.text);
     * }
     * @example
     * [...line.iterWords()].forEach(
     *   (word) => console.log(word.text)
     * );
     */
    iterWords(): Iterable<Word> {
      return getIterable(() => this._words);
    }

    listWords(): Word[] {
      return this._words.slice();
    }

    /**
     * Get a particular Word from the object by index
     * @param ix 0-based index in the word list
     * @throws if the index is out of bounds
     */
    wordAtIndex(ix: number): Word {
      if (ix < 0 || ix >= this._words.length) {
        throw new Error(`Word index ${ix} must be >=0 and <${this._words.length}`);
      }
      return this._words[ix];
    }
  };
}

export class Line extends WithWords(ApiBlockWrapper)<ApiLineBlock> {
  _geometry: Geometry<ApiLineBlock, Line>;
  _parentPage: Page;

  constructor(block: ApiLineBlock, parentPage: Page) {
    super(block);
    this._parentPage = parentPage;
    this._words = [];
    this._geometry = new Geometry(block.Geometry, this);
    const parentDocument = parentPage.parentDocument;
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            const wordBlock = parentDocument.getBlockById(cid);
            if (!wordBlock) {
              console.warn(`Document missing word block ${cid} referenced by line ${this.id}`);
              return;
            }
            if (wordBlock.BlockType == ApiBlockType.Word)
              this._words.push(new Word(wordBlock as ApiWordBlock));
          });
        }
      });
    }
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiLineBlock, Line> {
    return this._geometry;
  }
  get parentPage(): Page {
    return this._parentPage;
  }
  get text(): string {
    return this._dict.Text;
  }

  str(): string {
    return `Line\n==========\n${this._dict.Text}\nWords\n----------\n${this._words
      .map((word) => `[${word.str()}]`)
      .join("")}`;
  }
}

export class SelectionElement extends ApiBlockWrapper<ApiSelectionElementBlock> {
  _geometry: Geometry<ApiSelectionElementBlock, SelectionElement>;

  constructor(block: ApiSelectionElementBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiSelectionElementBlock, SelectionElement> {
    return this._geometry;
  }
  get selectionStatus(): ApiSelectionStatus {
    return this._dict.SelectionStatus;
  }
  set selectionStatus(newVal: ApiSelectionStatus) {
    this._dict.SelectionStatus = newVal;
  }
}

export class FieldKey extends WithWords(ApiBlockWrapper)<ApiKeyValueSetBlock> {
  _geometry: Geometry<ApiKeyValueSetBlock, FieldKey>;
  _parentField: Field;

  constructor(block: ApiKeyValueSetBlock, parentField: Field) {
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
  get geometry(): Geometry<ApiKeyValueSetBlock, FieldKey> {
    return this._geometry;
  }
  get parentField(): Field {
    return this._parentField;
  }
  get text(): string {
    return this._words.map((w) => w.text).join(" ");
  }

  str(): string {
    return this.text;
  }
}

export class FieldValue extends ApiBlockWrapper<ApiKeyValueSetBlock> {
  _content: Array<SelectionElement | Word>;
  _geometry: Geometry<ApiKeyValueSetBlock, FieldValue>;
  _parentField: Field;

  constructor(valueBlock: ApiKeyValueSetBlock, parentField: Field) {
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
  get geometry(): Geometry<ApiKeyValueSetBlock, FieldValue> {
    return this._geometry;
  }
  get parentField(): Field {
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

export class Field {
  _key: FieldKey;
  _parentForm: Form;
  _value: FieldValue | null;

  constructor(keyBlock: ApiKeyValueSetBlock, parentForm: Form) {
    this._parentForm = parentForm;
    this._value = null;

    this._key = new FieldKey(keyBlock, this);

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
        this._value = new FieldValue(valBlock as ApiKeyValueSetBlock, this);
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
  get key(): FieldKey {
    return this._key;
  }
  get parentForm(): Form {
    return this._parentForm;
  }
  get value(): FieldValue | null {
    return this._value;
  }

  str(): string {
    return `\nField\n==========\nKey: ${this._key ? this._key.str() : ""}\nValue: ${
      this._value ? this._value.str() : ""
    }`;
  }
}

export class Form {
  _fields: Field[];
  _fieldsMap: { [keyText: string]: Field };
  _parentPage: Page;

  constructor(keyBlocks: ApiKeyValueSetBlock[], parentPage: Page) {
    this._fields = [];
    this._fieldsMap = {};
    this._parentPage = parentPage;

    keyBlocks.forEach((keyBlock) => {
      const f = new Field(keyBlock, this);
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
  get parentPage(): Page {
    return this._parentPage;
  }

  getFieldByKey(key: string): Field | null {
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
  iterFields(skipFieldsWithoutKey = false): Iterable<Field> {
    return getIterable(() => this.listFields(skipFieldsWithoutKey));
  }

  /**
   * List the Fields in the Form.
   * @param skipFieldsWithoutKey Set `true` to skip fields with no field.key (Included by default)
   */
  listFields(skipFieldsWithoutKey = false): Field[] {
    return skipFieldsWithoutKey ? this._fields.filter((f) => f.key) : this._fields.slice();
  }

  /**
   * List the Fields in the Form with key text containing (case-insensitive) `key`
   * @param key The text to search for in field keys
   */
  searchFieldsByKey(key: string): Field[] {
    const searchKey = key.toLowerCase();
    return this._fields.filter((field) => field.key && field.key.text.toLowerCase().indexOf(searchKey) >= 0);
  }

  str(): string {
    return this._fields.map((f) => f.str()).join("\n");
  }
}

/**
 * Base for a table cell, which may be merged or not.
 */
export abstract class CellBase<T extends ApiCellBlock | ApiMergedCellBlock> extends ApiBlockWrapper<T> {
  _geometry: Geometry<T, CellBase<T>>;
  _parentTable: Table;

  constructor(block: T, parentTable: Table) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
    this._parentTable = parentTable;
  }

  get columnIndex(): number {
    return this._dict.ColumnIndex;
  }
  get columnSpan(): number {
    return this._dict.ColumnSpan || 1;
  }
  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<T, CellBase<T>> {
    return this._geometry;
  }

  get parentTable(): Table {
    return this._parentTable;
  }
  get rowIndex(): number {
    return this._dict.RowIndex;
  }
  get rowSpan(): number {
    return this._dict.RowSpan || 1;
  }

  abstract get text(): string;
  abstract listContent(): Array<SelectionElement | Word>;
  abstract str(): string;
}

/**
 * A non-merged table cell (or sub-cell of a merged cell)
 */
export class Cell extends CellBase<ApiCellBlock> {
  _content: Array<SelectionElement | Word>;
  _text: string;

  constructor(block: ApiCellBlock, parentTable: Table) {
    super(block, parentTable);
    const parentDocument = parentTable.parentPage.parentDocument;
    this._geometry = new Geometry(block.Geometry, this);
    this._content = [];
    const texts: string[] = [];
    (block.Relationships || []).forEach((rs) => {
      if (rs.Type == ApiRelationshipType.Child) {
        rs.Ids.forEach((cid) => {
          const childBlock = parentDocument.getBlockById(cid);
          if (!childBlock) {
            console.warn(`Document missing child block ${cid} referenced by table cell ${this.id}`);
            return;
          }
          const blockType = childBlock.BlockType;
          if (blockType == ApiBlockType.Word) {
            const w = new Word(childBlock as ApiWordBlock);
            this._content.push(w);
            texts.push(w.text);
          } else if (blockType == ApiBlockType.SelectionElement) {
            const se = new SelectionElement(childBlock as ApiSelectionElementBlock);
            this._content.push(se);
            texts.push(se.selectionStatus + ",");
          }
        });
      }
    });
    this._text = texts.join(" ");
  }

  get text(): string {
    return this._text;
  }

  listContent(): Array<SelectionElement | Word> {
    return this._content.slice();
  }

  str(): string {
    return this._text;
  }
}

/**
 * A merged table cell (Spanning more than one row or column of the table)
 */
export class MergedCell extends CellBase<ApiMergedCellBlock> {
  _cells: Cell[];

  constructor(block: ApiMergedCellBlock, parentTable: Table) {
    super(block, parentTable);

    let cells: Cell[] = [];
    (block.Relationships || []).forEach((rs) => {
      if (rs.Type == ApiRelationshipType.Child) {
        cells = cells.concat(rs.Ids.map((cid) => parentTable._getSplitCellByBlockId(cid)));
      }
    });
    this._cells = cells;
  }

  get text(): string {
    return this._cells.map((c) => c.text).join(" ");
  }

  listContent(): Array<SelectionElement | Word> {
    return ([] as Array<SelectionElement | Word>).concat(...this._cells.map((c) => c.listContent()));
  }

  str(): string {
    return this.text;
  }
}

export class Row {
  _cells: Array<Cell | MergedCell>;
  _parentTable: Table;

  constructor(cells: Array<Cell | MergedCell> = [], parentTable: Table) {
    this._cells = cells;
    this._parentTable = parentTable;
  }

  get nCells(): number {
    return this._cells.length;
  }
  get parentTable(): Table {
    return this._parentTable;
  }

  /**
   * Iterate through the cells in this row
   * @example
   * for (const cell of row.iterCells()) {
   *   console.log(cell.text);
   * }
   * @example
   * [...row.iterCells()].forEach(
   *   (cell) => console.log(cell.text)
   * );
   */
  iterCells(): Iterable<Cell | MergedCell> {
    return getIterable(() => this._cells);
  }

  listCells(): Array<Cell | MergedCell> {
    return this._cells.slice();
  }

  str(): string {
    return this._cells.map((cell) => `[${cell.str()}]`).join("");
  }
}

export class Table extends ApiBlockWrapper<ApiTableBlock> {
  _cells: Cell[];
  _cellsById: { [id: string]: Cell };
  _mergedCells: MergedCell[];
  _geometry: Geometry<ApiTableBlock, Table>;
  _nCols: number;
  _nRows: number;
  _parentPage: Page;

  constructor(block: ApiTableBlock, parentPage: Page) {
    super(block);
    this._parentPage = parentPage;
    this._geometry = new Geometry(block.Geometry, this);

    const parentDocument = parentPage.parentDocument;
    this._cells = ([] as Cell[]).concat(
      ...(block.Relationships || [])
        .filter((rs) => rs.Type == ApiRelationshipType.Child)
        .map(
          (rs) =>
            rs.Ids.map((cid) => {
              const cellBlock = parentDocument.getBlockById(cid);
              if (!cellBlock) {
                console.warn(`Document missing child block ${cid} referenced by TABLE ${this.id}`);
                return;
              }
              return new Cell(cellBlock as ApiCellBlock, this);
            }).filter((cell) => cell) as Cell[]
        )
    );

    this._sortCellsByLocation(this._cells);
    // This indexing could be moved to a utility function if supporting more mutation operations in future:
    this._nCols = this._cells.reduce((acc, next) => Math.max(acc, next.columnIndex + next.columnSpan - 1), 0);
    this._nRows = this._cells.reduce((acc, next) => Math.max(acc, next.rowIndex + next.rowSpan - 1), 0);

    this._cellsById = {};
    this._updateCellsById();
    this._mergedCells = ([] as MergedCell[]).concat(
      ...(block.Relationships || [])
        .filter((rs) => rs.Type == ApiRelationshipType.MergedCell)
        .map(
          (rs) =>
            rs.Ids.map((cid) => {
              const cellBlock = parentDocument.getBlockById(cid);
              if (!cellBlock) {
                console.warn(`Document missing merged cell block ${cid} referenced by TABLE ${this.id}`);
                return;
              }
              return new MergedCell(cellBlock as ApiMergedCellBlock, this);
            }).filter((cell) => cell) as MergedCell[]
        )
    );
  }

  /**
   * Sort an array of table cells by position (row, column) in-place
   * @param cells Array of (merged or raw) cells
   */
  _sortCellsByLocation<T extends Cell | MergedCell>(cells: Array<T>): void {
    cells.sort((a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex);
  }

  /**
   * Update this Table instance's map of (split) Cells by ID for efficient retrieval
   */
  _updateCellsById(): void {
    this._cellsById = this._cells.reduce((acc, next) => {
      acc[next.id] = next;
      return acc;
    }, {} as { [id: string]: Cell });
  }

  /**
   * Efficiently retrieve a (split) Cell in this table by Textract block ID
   * 
   * This allows MergedCell objects to retrieve references to parsed Cells they wrap, instead of raw
   * ApiCellBlocks.
   * @throws (Rather than returning undefined) if the block ID is missing from the table.
   */
  _getSplitCellByBlockId(id: string): Cell {
    let result: Cell = this._cellsById[id];
    if (result) {
      return result;
    } else {
      this._updateCellsById();
      result = this._cellsById[id];
      if (!result) {
        throw new Error(`Referenced cell ID ${id} missing from TABLE ${this.id}`);
      }

      return result;
    }
  }

  /**
   * Get the Cell at a particular Y, X coordinate in the table.
   * @param rowIndex 1-based index of the target row in the table
   * @param columnIndex 1-based index of the target column in the table
   * @param ignoreMerged Set `true` to ignore merged cells (returning specific sub-cells)
   * @returns Cell at the specified row & column, or undefined if none is present.
   */
  cellAt(rowIndex: number, columnIndex: number, ignoreMerged = false): Cell | MergedCell | undefined {
    const mergedResult =
      !ignoreMerged &&
      this._mergedCells.find(
        (c) =>
          c.columnIndex <= columnIndex &&
          c.columnIndex + c.columnSpan > columnIndex &&
          c.rowIndex <= rowIndex &&
          c.rowIndex + c.rowSpan > rowIndex
      );
    if (mergedResult) {
      return mergedResult;
    } else {
      // Non-merged cells cannot have rowSpan/columnSpan > 1 anyway:
      return this._cells.find((c) => c.columnIndex === columnIndex && c.rowIndex === rowIndex);
    }
  }

  /**
   * List the cells at a particular {row, column, or combination} in the table
   * @param rowIndex 1-based index of the target row in the table
   * @param columnIndex 1-based index of the target column in the table
   * @param ignoreMerged Set `true` to ignore merged cells (returning specific sub-cells)
   * @returns Cell at the specified row & column, or undefined if none is present.
   */
  cellsAt(
    rowIndex: number | null,
    columnIndex: number | null,
    ignoreMerged = false
  ): Array<Cell | MergedCell> {
    const mergedCells = ignoreMerged
      ? []
      : this._mergedCells.filter(
          (c) =>
            (rowIndex == null || (c.rowIndex <= rowIndex && c.rowIndex + c.rowSpan > rowIndex)) &&
            (columnIndex == null ||
              (c.columnIndex <= columnIndex && c.columnIndex + c.columnSpan > columnIndex))
        );
    const mergedCellChildIds = mergedCells.reduce((acc, next) => {
      next._cells.forEach((c) => {
        acc[c.id] = true;
      });
      return acc;
    }, {} as { [id: string]: true });
    const rawCells = this._cells.filter(
      (c) =>
        (rowIndex == null || c.rowIndex === rowIndex) &&
        (columnIndex == null || c.columnIndex === columnIndex) &&
        !(c.id in mergedCellChildIds)
    );
    const result = (mergedCells as Array<Cell | MergedCell>).concat(rawCells);
    this._sortCellsByLocation(result);
    return result;
  }

  /**
   * Iterate through the rows of the table
   * @param repeatMultiRowCells Set `true` to include rowspan>1 cells in every `Row` they intersect with.
   * @example
   * for (const row of table.iterRows()) {
   *   for (const cell of row.iterCells()) {
   *     console.log(cell.text);
   *   }
   * }
   * @example
   * [...table.iterRows()].forEach(
   *   (row) => [...row.iterCells()].forEach(
   *     (cell) => console.log(cell.text)
   *   )
   * );
   */
  iterRows(repeatMultiRowCells = false): Iterable<Row> {
    const getIterator = (): Iterator<Row> => {
      let ixRow = 0;
      return {
        next: (): IteratorResult<Row> => {
          if (ixRow < this._nRows) {
            return {
              done: false,
              value: this.rowAt(++ixRow, repeatMultiRowCells),
            };
          } else {
            return {
              done: true,
              value: undefined,
            };
          }
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  /**
   * List the rows of the table
   * @param repeatMultiRowCells Set `true` to include rowspan>1 cells in every `Row` they intersect with.
   */
  listRows(repeatMultiRowCells = false): Row[] {
    return [...Array(this._nRows).keys()].map((ixRow) => this.rowAt(ixRow + 1, repeatMultiRowCells));
  }

  /**
   * List the cells at a particular {row, column, or combination} in the table
   * @param rowIndex 1-based index of the target row in the table
   * @param repeatMultiRowCells Set `true` to include rowspan>1 cells in every `Row` they intersect with.
   */
  rowAt(rowIndex: number, repeatMultiRowCells = false): Row {
    const allRowCells = this.cellsAt(rowIndex, null);
    return new Row(
      repeatMultiRowCells ? allRowCells : allRowCells.filter((c) => c.rowIndex === rowIndex),
      this
    );
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiTableBlock, Table> {
    return this._geometry;
  }
  get nCells(): number {
    return this._cells.length;
  }
  get nColumns(): number {
    return this._nCols;
  }
  get nRows(): number {
    return this._nRows;
  }
  get parentPage(): Page {
    return this._parentPage;
  }

  str(): string {
    return (
      "Table\n==========\n" +
      this.listRows()
        .map((row) => `Row\n==========\n${row.str()}`)
        .join("\n")
    );
  }
}

/**
 * @experimental
 */
export interface HeuristicReadingOrderModelParams {
  /**
   * Minimum ratio (0-1) of overlap to count a paragraph within a detected column. Applied relative
   * to the *minimum* of {paragraph width, column width}. Can set close to 1 if your columns are
   * well-defined with little skew and no hanging indents.
   */
  colHOverlapThresh?: number;
  /**
   * Minimum ratio (0-1) of intersection to count a paragraph within a detected column. Applied
   * relative to the *union* of {paragraph, column} horizontal span, and *only* when both the
   * paragraph and column contain multiple lines (since single-line paragraphs may be significantly
   * short). Can set close to 1 if your text is justified, since individual paragraphs in a column
   * should have reliably very similar widths.
   */
  colHMultilineUnionThresh?: number;
  /**
   * Maximum vertical distance, in multiples of line height, for a line to be considered eligible
   * for merging into a paragraph. 1.0 may make a sensible default. May set >1.0 if your text has
   * large spacing between lines within a paragraph, or <1.0 if your paragraphs have little
   * vertical separating space between them.
   */
  paraVDistTol?: number;
  /**
   * Maximum ratio of deviation of this line height from average line height in a paragraph, for a
   * line to be considered eligible for merging into a paragraph. Set close to 0 to encourage text
   * size changes to be represented as paragraph breaks (e.g. close-together heading/subheading).
   */
  paraLineHeightTol?: number;
  /**
   * Optional maximum indentation of a line versus previous, after which the line will be forced
   * into a new paragraph even if vertical distance is small. Set =0 to disable this behavior (for
   * e.g. with center-aligned text or where paragraphs are marked by vertical whitespace), or >0 to
   * specify paragraph indentation in terms of a multiplier on text line-height. Default 0.
   */
  paraIndentThresh?: number;
}

/**
 * @experimental
 */
export interface HeaderFooterSegmentModelParams {
  /**
   * Cut-off maximum proportion of the page height that the header/footer must be within. Set close
   * to 0 if main content is known to start very close to the page edge, or higher to allow more
   * space for the header/footer search. Default 0.16 (16% page height).
   * @default 0.16 (16% page height)
   */
  maxMargin?: number;
  /**
   * Minimum vertical spacing between header/footer and main page content, as a proportion of
   * average local text LINE height. The header/footer will break on the first gap bigger than
   * this, working in from the edge of the page towards content. Set close to 0 if the main content
   * is known to start very close, or higher if multiple vertically-separate paragraphs/lines
   * should be captured in the header/footer. Default 0.8 (80% line height).
   * @default 0.8 (80% line height)
   */
  minGap?: number;
}

export class Page extends ApiBlockWrapper<ApiPageBlock> {
  _blocks: ApiBlock[];
  _content: Array<Line | Table | Field>;
  _form: Form;
  _geometry: Geometry<ApiPageBlock, Page>;
  _lines: Line[];
  _parentDocument: TextractDocument;
  _tables: Table[];

  constructor(pageBlock: ApiPageBlock, blocks: ApiBlock[], parentDocument: TextractDocument) {
    super(pageBlock);
    this._blocks = blocks;
    this._parentDocument = parentDocument;
    this._geometry = new Geometry(pageBlock.Geometry, this);

    // Placeholders pre-parsing to keep TypeScript happy:
    this._content = [];
    this._lines = [];
    this._tables = [];
    this._form = new Form([], this);
    // Parse the content:
    this._parse(blocks);
  }

  _parse(blocks: ApiBlock[]): void {
    this._content = [];
    this._lines = [];
    this._tables = [];
    const formKeyBlocks: ApiKeyValueSetBlock[] = [];

    blocks.forEach((item) => {
      if (item.BlockType == ApiBlockType.Line) {
        const l = new Line(item, this);
        this._lines.push(l);
        this._content.push(l);
      } else if (item.BlockType == ApiBlockType.Table) {
        const t = new Table(item, this);
        this._tables.push(t);
        this._content.push(t);
      } else if (item.BlockType == ApiBlockType.KeyValueSet) {
        if (item.EntityTypes.indexOf(ApiKeyValueEntityType.Key) >= 0) {
          formKeyBlocks.push(item);
        }
      }
    });

    this._form = new Form(formKeyBlocks, this);
  }

  /**
   * Calculate the most common orientation (in whole degrees) of 'WORD' content in the page.
   */
  getModalWordOrientationDegrees(): number | null {
    const wordDegreesByLine = this.listLines().map((line) =>
      line.listWords().map((word) => word.geometry.orientationDegrees())
    );

    const wordDegrees = ([] as Array<number | null>)
      .concat(...wordDegreesByLine)
      .filter((n) => n != null) as number[];

    return modalAvg(wordDegrees.map((n) => Math.round(n)));
  }

  /**
   * List lines in reading order, grouped by pseudo-'paragraph' and contiguous 'column'
   * @returns Nested array of text lines by column, paragraph, line
   * @private
   */
  _getLineClustersByColumn({
    colHOverlapThresh = 0.8,
    colHMultilineUnionThresh = 0.7,
    paraVDistTol = 0.7,
    paraLineHeightTol = 0.3,
    paraIndentThresh = 0,
  }: HeuristicReadingOrderModelParams = {}): Line[][][] {
    // First, assign lines to paragraphs:
    const paraBoxes: BoundingBox<ApiLineBlock, ApiObjectWrapper<ApiLineBlock>>[] = [];
    const paraLines: Line[][] = [];
    const paraTotalLineHeight: number[] = [];
    const lineHCenters = this._lines.map((l) => l.geometry.boundingBox.hCenter);
    this._lines.forEach((line, ixLine) => {
      const lineBox = line.geometry.boundingBox;
      const lineHCenter = lineHCenters[ixLine];
      // Geometries we get from Amazon Textract are bounding boxes for the detections, not necessarily
      // corrected for the inferred font size / line height. For example 'A' will be significantly taller
      // than 'a', and extreme outliers may be possible like e.g. '-'. In order to have some notion of line
      // height for grouping text to paragraphs, we'll heuristically adjust the raw boxes in special cases
      // where only a subset of small-height characters were detected:
      let isLineHeightGarbage: boolean;
      let adjLineBox: BoundingBox<unknown, ApiBlockWrapper<unknown & ApiBlock>>;
      if (!/[^.,_\s]/.test(line.text)) {
        // All low punctuation marks - line height is really a guess
        isLineHeightGarbage = true;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top - lineBox.height * 1.5,
            Left: lineBox.left,
            Height: lineBox.height * 2.5,
            Width: lineBox.width,
          },
          null
        );
      } else if (!/[^-–—=~\s]/.test(line.text)) {
        // All low punctuation marks (e.g. just a dash?) - line height is really a guess
        isLineHeightGarbage = true;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top - lineBox.height * 0.75, // Vertically centered on previous
            Left: lineBox.left,
            Height: lineBox.height * 2.5,
            Width: lineBox.width,
          },
          null
        );
      } else if (!/[^'"`^\s]/.test(line.text)) {
        // All high punctuation marks - line height is really a guess
        isLineHeightGarbage = true;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top,
            Left: lineBox.left,
            Height: lineBox.height * 2.5,
            Width: lineBox.width,
          },
          null
        );
      } else if (!/[^-–—=~.,_acemnorsuvwxz+<>:;\s]/.test(line.text)) {
        // All low/mid punctuation and x-height letters - adjust line height up slightly
        isLineHeightGarbage = false;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top - lineBox.height * 0.25,
            Left: lineBox.left,
            Height: lineBox.height * 1.25,
            Width: lineBox.width,
          },
          null
        );
      } else {
        // Keep box as-is
        isLineHeightGarbage = false;
        adjLineBox = lineBox;
      }
      let assignedPara: number | null = null;
      for (let ixPara = 0; ixPara < paraBoxes.length; ++ixPara) {
        const paraBox = paraBoxes[ixPara];
        const paraHCenter = paraBox.hCenter;
        const nCurrParaLines = paraLines[ixPara].length;
        let newTotalLineHeight: number;
        let newAvgLineHeight: number;
        if (isLineHeightGarbage) {
          newAvgLineHeight = paraTotalLineHeight[ixPara] / nCurrParaLines; // Unchanged
          newTotalLineHeight = newAvgLineHeight * (nCurrParaLines + 1);
        } else {
          newTotalLineHeight = paraTotalLineHeight[ixPara] + adjLineBox.height;
          newAvgLineHeight = newTotalLineHeight / (nCurrParaLines + 1);
        }
        // These distances can't both be >0, and will both be <0 if they overlap
        const vDist = Math.max(0, adjLineBox.top - paraBox.bottom, paraBox.top - adjLineBox.bottom);
        let passIndentationCheck: boolean;
        if (paraIndentThresh) {
          const paraLastLine = paraLines[ixPara][nCurrParaLines - 1];
          // If paragraphs are started with indentation, we should regard paragraphs with only a single line
          // in as having a reference position offset to the left. Otherwise, just paragraph bbox:
          const paraRefLeft =
            paraLastLine.geometry.boundingBox.left -
            (nCurrParaLines === 1 ? paraIndentThresh * newAvgLineHeight : 0);
          const vIsectTop = Math.max(adjLineBox.top, paraBox.top);
          const vIsectBottom = Math.min(adjLineBox.bottom, paraBox.bottom);
          const vIsect = Math.max(0, vIsectBottom - vIsectTop);
          passIndentationCheck =
            Math.max(0, adjLineBox.left - paraRefLeft) < paraIndentThresh * newAvgLineHeight ||
            vIsect > 0.5 * adjLineBox.height;
        } else {
          passIndentationCheck = true;
        }
        if (
          // Line has good horizontal overlap with the working "paragraph":
          ((lineHCenter > paraBox.left && lineHCenter < paraBox.right) ||
            (paraHCenter > lineBox.left && paraHCenter < lineBox.right)) &&
          // Line is vertically within N line-heights of the "paragraph":
          vDist < newAvgLineHeight * paraVDistTol &&
          // Line has similar line height to the rest of the "paragraph"s text, unless the line is
          // composed of such charcters that it's height is basically meaningless:
          (isLineHeightGarbage ||
            Math.abs((newAvgLineHeight - adjLineBox.height) / newAvgLineHeight) < paraLineHeightTol) &&
          // Indentation check if enabled:
          passIndentationCheck
        ) {
          assignedPara = ixPara;
          paraBoxes[ixPara] = paraBox.union(lineBox);
          paraLines[ixPara].push(line);
          paraTotalLineHeight[ixPara] = newTotalLineHeight;
          break;
        }
      }
      if (assignedPara == null) {
        paraBoxes.push(new BoundingBox(lineBox.dict));
        paraLines.push([line]);
        paraTotalLineHeight.push(lineBox.height);
      }
    });

    // At this point we essentially have paragraphs in default order, so typically columns will be
    // interleaved. Assign the paragraphs to "columns" to correct for this:
    const colBoxes: BoundingBox<ApiLineBlock, ApiObjectWrapper<ApiLineBlock>>[] = [];
    const colParas: Line[][][] = [];
    paraLines.forEach((para, ixPara) => {
      const paraBox = paraBoxes[ixPara];
      let assignedCol: number | null = null;
      for (let ixCol = 0; ixCol < colBoxes.length; ++ixCol) {
        const colBox = colBoxes[ixCol];
        const thisColParas = colParas[ixCol];
        const vIsectTop = Math.max(colBox.top, paraBox.top);
        const vIsectBottom = Math.min(colBox.bottom, paraBox.bottom);
        const vIsect = Math.max(0, vIsectBottom - vIsectTop);
        const hIsectLeft = Math.max(colBox.left, paraBox.left);
        const hIsectRight = Math.min(colBox.right, paraBox.right);
        const hIsect = Math.max(0, hIsectRight - hIsectLeft);
        const hUnion = Math.max(colBox.right, paraBox.right) - Math.min(colBox.left, paraBox.left);
        const minWidth = Math.min(colBox.width, paraBox.width);
        const proposedColBox = colBox.union(paraBox);
        const matchingVsSingleLine =
          para.length === 1 || (thisColParas.length === 1 && thisColParas[0].length === 1);
        const paraLineHeight = paraTotalLineHeight[ixPara] / paraLines[ixPara].length;
        if (
          // Paragraph has no significant vertical overlap with the working column:
          vIsect < paraLineHeight * 0.1 &&
          // Paragraph has good horizontal overlap with the working column:
          hIsect / minWidth >= colHOverlapThresh &&
          // Multi-line paragraph should have a more stringent horizontal overlap with the working
          // column (because a single-line paragraph can be short):
          (matchingVsSingleLine || hIsect / hUnion >= colHMultilineUnionThresh) &&
          hIsect / minWidth >= colHOverlapThresh &&
          // The newly-modified column would not overlap with any other column:
          colBoxes.filter((cbox) => cbox.intersection(proposedColBox)).length === 1
        ) {
          assignedCol = ixCol;
          colBoxes[ixCol] = colBox.union(paraBox);
          colParas[ixCol].push(para);
          break;
        }
      }
      if (assignedCol == null) {
        colBoxes.push(new BoundingBox(paraBox.dict));
        colParas.push([para]);
      }
    });

    return colParas;
  }

  /**
   * List lines in reading order, grouped by 'cluster' (somewhat like a paragraph)
   *
   * This method works by applying local heuristics to group text together into paragraphs, and then sorting
   * paragraphs into "columns" in reading order. Although parameters are exposed to customize the behaviour,
   * note that this customization API is experimental and subject to change. For complex requirements,
   * consider implementing your own more robust approach - perhaps using expected global page structure.
   *
   * @returns Nested array of text lines by paragraph, line
   */
  getLineClustersInReadingOrder({
    colHOverlapThresh = 0.8,
    colHMultilineUnionThresh = 0.7,
    paraVDistTol = 0.7,
    paraLineHeightTol = 0.3,
    paraIndentThresh = 0,
  }: HeuristicReadingOrderModelParams = {}): Line[][] {
    // Pass through to the private function, but flatten the result to simplify out the "columns":
    return ([] as Line[][]).concat(
      ...this._getLineClustersByColumn({
        colHOverlapThresh,
        colHMultilineUnionThresh,
        paraVDistTol,
        paraLineHeightTol,
        paraIndentThresh,
      })
    );
  }

  getTextInReadingOrder({
    colHOverlapThresh = 0.8,
    colHMultilineUnionThresh = 0.7,
    paraVDistTol = 0.7,
    paraLineHeightTol = 0.3,
    paraIndentThresh = 0,
  }: HeuristicReadingOrderModelParams = {}): string {
    return this.getLineClustersInReadingOrder({
      colHOverlapThresh,
      colHMultilineUnionThresh,
      paraVDistTol,
      paraLineHeightTol,
      paraIndentThresh,
    })
      .map((lines) => lines.map((l) => l.text).join("\n"))
      .join("\n\n");
  }

  /**
   * Split lines of text into vertically contiguous groups, and describe the gaps between groups
   *
   * Useful for finding vertical cut-offs by looking for largest vertical gaps in a region. Note
   * that by 'contiguous' here we mean literally overlapping: small gaps are not filtered out, and
   * the iterative splitting process may cause the output order to be different from either the
   * human reading order or the Amazon Textract output order.
   *
   * @param {number} focusTop Top coordinate of the search area on the page. All lines above the
   *      search area will be compressed into one group regardless of separation.
   * @param {number} focusHeight Height of the search area on the page. All lines below the search
   *      area will be compressed into one group regardless of separation.
   * @param {Line[]} [lines] Optional array of Line objects to group. By default, the full list of
   *      lines on the page will be analyzed.
   * @returns Object with props 'lines' (the list of Lines in each group) and 'vGaps' (a
   *      list of BoundingBox objects describing the gaps between the groups). Note that this means
   *      `lines.length == vGaps.length + 1`.
   */
  _groupLinesByVerticalGaps(
    focusTop: number,
    focusHeight: number,
    lines?: Line[]
  ): { vGaps: BoundingBox<unknown, ApiObjectWrapper<unknown>>[]; lines: Line[][] } {
    // Start with one big "gap" covering the entire focus region, and iteratively split/refine it
    // from the lines of text:
    let vGaps = [
      new BoundingBox(
        {
          Top: focusTop,
          Left: this._geometry.boundingBox.left,
          Height: focusHeight,
          Width: this._geometry.boundingBox.width,
        },
        null
      ),
    ];
    let preGapLineLists: Line[][] = [[]];
    let postLines: Line[] = [];

    (lines || this._lines).forEach((line) => {
      const lineBox = line.geometry.boundingBox;
      // Fast exit for lines not in the focus area:
      if (lineBox.top > vGaps[vGaps.length - 1].bottom) {
        postLines.push(line);
        return;
      } else if (lineBox.bottom < vGaps[0].top) {
        preGapLineLists[0].push(line);
        return;
      }

      const nextGaps = [];
      const nextPreGapLineLists = [];
      let orphanedLines: Line[] = [];
      let lineAssigned = false;
      // Loop from top to bottom, updating the vGaps per the new text line:
      for (let ixGap = 0; ixGap < vGaps.length; ++ixGap) {
        const gap = vGaps[ixGap];
        const preGapLineList = preGapLineLists[ixGap];
        const isect = lineBox.intersection(gap);
        if (!isect) {
          // This gap is preserved as-is
          nextGaps.push(gap);
          nextPreGapLineLists.push(orphanedLines.concat(preGapLineList));
          orphanedLines = [];
          continue;
        } else if (isect.top === gap.top && isect.height === gap.height) {
          // This gap is fully covered by the line: Delete it
          orphanedLines = orphanedLines.concat(preGapLineList);
          continue;
        } else if (isect.top > gap.top && isect.bottom < gap.bottom) {
          // This gap is split in two
          nextGaps.push(
            new BoundingBox(
              {
                Top: gap.top,
                Left: gap.left,
                Height: isect.top - gap.top,
                Width: gap.width,
              },
              null
            )
          );
          nextPreGapLineLists.push(orphanedLines.concat(preGapLineList));
          orphanedLines = [];
          nextGaps.push(
            new BoundingBox(
              {
                Top: isect.bottom,
                Left: gap.left,
                Height: gap.bottom - isect.bottom,
                Width: gap.width,
              },
              null
            )
          );
          nextPreGapLineLists.push([line]);
          lineAssigned = true;
        } else {
          // This gap is part-covered: Adjust it
          const preGapLines = orphanedLines.concat(preGapLineList);
          if (isect.top === gap.top) {
            // If the intersection starts at the gap top, this gap must be the one that immediately
            // follows this line:
            preGapLines.push(line);
            lineAssigned = true;
            nextGaps.push(
              new BoundingBox(
                {
                  Top: gap.top + isect.height,
                  Left: gap.left,
                  Height: gap.height - isect.height,
                  Width: gap.width,
                },
                null
              )
            );
          } else {
            nextGaps.push(
              new BoundingBox(
                {
                  Top: gap.top,
                  Left: gap.left,
                  Height: isect.top - gap.top,
                  Width: gap.width,
                },
                null
              )
            );
          }
          nextPreGapLineLists.push(preGapLines);
          orphanedLines = [];
        }
      }
      vGaps = nextGaps;
      preGapLineLists = nextPreGapLineLists;
      postLines = orphanedLines.concat(postLines);

      // If the text line was not already directly assigned to a vGap (by splitting a gap or
      // trimming its top), then find the latest gap immediately following it:
      if (!lineAssigned) {
        const followGapIx = vGaps.findIndex((gap) => gap.top >= lineBox.bottom);
        if (followGapIx < 0) {
          postLines.push(line);
        } else {
          preGapLineLists[followGapIx].push(line);
        }
      }
    });

    return {
      vGaps,
      lines: preGapLineLists.concat([postLines]),
    };
  }

  /**
   * Identify (via heuristics) the list of Lines likely to be page header or page footer.
   *
   * Output lines are not guaranteed to be sorted either in reading order or strictly in the
   * default Amazon Textract output order.
   *
   * @param {boolean} isHeader Set true for header, or false for footer.
   * @param {HeaderFooterSegmentModelParams} [config] (Experimental) heuristic configurations.
   * @param {Line[]} [fromLines] Optional array of Line objects to group. By default, the full list
   *      of lines on the page will be analyzed.
   * @returns {Line[]} Array of Lines in the relevant section.
   */
  _getHeaderOrFooterLines(
    isHeader: boolean,
    { maxMargin = 0.16, minGap = 0.8 }: HeaderFooterSegmentModelParams = {},
    fromLines?: Line[]
  ): Line[] {
    // Find contiguous vertical gaps (spaces with no LINEs) in the defined area of the page:
    const { vGaps, lines: linesByGap } = this._groupLinesByVerticalGaps(
      isHeader ? this._geometry.boundingBox.top : this._geometry.boundingBox.bottom - maxMargin,
      maxMargin,
      fromLines
    );

    // We'll look at gaps relative to text line height, rather than absolute page size:
    // ...But need to be careful as some linesByGap (e.g. at the very edge of the page) may have
    // no text.
    const lineGroupAvgHeights: Array<number | null> = linesByGap.map((lines) =>
      lines.length ? lines.reduce((acc, l) => acc + l.geometry.boundingBox.height, 0) / lines.length : null
    );
    const nonNullLineGroupAvgHeights = lineGroupAvgHeights.filter((h) => h) as number[];
    const defaultLineHeight =
      nonNullLineGroupAvgHeights.reduce((acc, h) => acc + h, 0) / nonNullLineGroupAvgHeights.length;
    const gapAvgLineHeights = vGaps.map((_, ixGap) => {
      const components: number[] = [];
      // Use the pre-gap section avg height if it's not null/zero:
      const preGapHeight = lineGroupAvgHeights[ixGap];
      if (preGapHeight) components.push(preGapHeight);
      // Also use the post-gap section avg height if it's not null/zero:
      const postGapHeight = lineGroupAvgHeights[ixGap + 1];
      if (postGapHeight) components.push(postGapHeight);

      if (components.length) {
        return components.reduce((acc, h) => acc + h, 0) / components.length;
      } else {
        // If neither the pre-gap nor post-gap line height are usable, take the default across all content:
        return defaultLineHeight;
      }
    });

    // Select the most likely gap in the focus area as the split between header/footer and content.
    if (isHeader) {
      // The header/content separator is the *first* gap which:
      // - Has some content on the edgeward side of it (i.e. not the gap at the very page edge)
      // - Is bigger than the minGap threshold
      const ixSplit = vGaps.findIndex(
        (gap, ixGap) =>
          (ixGap > 0 || linesByGap[ixGap].length) && gap.height >= gapAvgLineHeights[ixGap] * minGap
      );
      return ixSplit < 0 ? [] : ([] as Line[]).concat(...linesByGap.slice(0, ixSplit + 1));
    } else {
      // For footer, apply the same process as header but working backwards from the page bottom.
      const revLinesBygap = linesByGap.slice().reverse();
      const revGapAvgLineHeights = gapAvgLineHeights.slice().reverse();
      const ixRevSplit = vGaps
        .slice()
        .reverse()
        .findIndex(
          (gap, ixGap) =>
            (ixGap > 0 || revLinesBygap[ixGap].length) && gap.height >= revGapAvgLineHeights[ixGap] * minGap
        );
      return ixRevSplit < 0 ? [] : ([] as Line[]).concat(...linesByGap.slice(vGaps.length - ixRevSplit));
    }
  }

  /**
   * Identify (via heuristics) the list of Lines likely to be page footer.
   *
   * Output lines are not guaranteed to be sorted either in reading order or strictly in the
   * default Amazon Textract output order. See also getLinesByLayoutArea() for this.
   *
   * @param {HeaderFooterSegmentModelParams} [config] (Experimental) heuristic configurations.
   * @param {Line[]} [fromLines] Optional array of Line objects to group. By default, the full list
   *      of lines on the page will be analyzed.
   * @returns {Line[]} Array of Lines in the relevant section.
   */
  getFooterLines(config: HeaderFooterSegmentModelParams = {}, fromLines?: Line[]): Line[] {
    return this._getHeaderOrFooterLines(false, config, fromLines);
  }

  /**
   * Identify (via heuristics) the list of Lines likely to be page header.
   *
   * Output lines are not guaranteed to be sorted either in reading order or strictly in the
   * default Amazon Textract output order. See also getLinesByLayoutArea() for this.
   *
   * @param {HeaderFooterSegmentModelParams} [config] (Experimental) heuristic configurations.
   * @param {Line[]} [fromLines] Optional array of Line objects to group. By default, the full list
   *      of lines on the page will be analyzed.
   * @returns {Line[]} Array of Lines in the relevant section.
   */
  getHeaderLines(config: HeaderFooterSegmentModelParams = {}, fromLines?: Line[]): Line[] {
    return this._getHeaderOrFooterLines(true, config, fromLines);
  }

  /**
   * Segment page text into header, content, and footer - optionally in (approximate) reading order
   *
   * @param {boolean|HeuristicReadingOrderModelParams} [inReadingOrder=false] Set true to sort text
   *      in reading order, or leave false (the default) to use the standard Textract ouput order
   *      instead. To customize the (experimental) parameters of the reading order model, pass in a
   *      configuration object instead of true.
   * @param {HeaderFooterSegmentModelParams} [headerConfig] (Experimental) heuristic configurations
   *      for header extraction.
   * @param {HeaderFooterSegmentModelParams} [footerConfig] (Experimental) heuristic configurations
   *      for footer extraction.
   * @returns Object with .header, .content, .footer properties: Each of type Line[].
   */
  getLinesByLayoutArea(
    inReadingOrder: boolean | HeuristicReadingOrderModelParams = false,
    headerConfig: HeaderFooterSegmentModelParams = {},
    footerConfig: HeaderFooterSegmentModelParams = {}
  ): { header: Line[]; content: Line[]; footer: Line[] } {
    const sourceLines = inReadingOrder
      ? ([] as Line[]).concat(
          ...(inReadingOrder === true
            ? this.getLineClustersInReadingOrder()
            : this.getLineClustersInReadingOrder(inReadingOrder))
        )
      : this._lines;

    const sourceLineSortOrder = sourceLines.reduce((acc, next, ix) => {
      acc[next.id] = ix;
      return acc;
    }, {} as { [id: string]: number });

    const header = this._getHeaderOrFooterLines(true, headerConfig, sourceLines).sort(
      (a, b) => sourceLineSortOrder[a.id] - sourceLineSortOrder[b.id]
    );
    let usedIds = header.reduce((acc, next) => {
      acc[next.id] = true;
      return acc;
    }, {} as { [key: string]: true });

    const footer = this._getHeaderOrFooterLines(
      false,
      footerConfig,
      sourceLines.filter((l) => !(l.id in usedIds))
    ).sort((a, b) => sourceLineSortOrder[a.id] - sourceLineSortOrder[b.id]);
    usedIds = footer.reduce((acc, next) => {
      acc[next.id] = true;
      return acc;
    }, usedIds);

    return {
      header,
      content: sourceLines
        .filter((l) => !(l.id in usedIds))
        .sort((a, b) => sourceLineSortOrder[a.id] - sourceLineSortOrder[b.id]),
      footer,
    };
  }

  /**
   * Iterate through the lines on the page in raw Textract order
   *
   * For reading order, see getLineClustersInReadingOrder instead.
   *
   * @example
   * for (const line of page.iterLines()) {
   *   console.log(line.text);
   * }
   */
  iterLines(): Iterable<Line> {
    return getIterable(() => this._lines);
  }

  /**
   * Iterate through the tables on the page
   * @example
   * for (const table of page.iterTables()) {
   *   console.log(table.str());
   * }
   * @example
   * const tables = [...page.iterTables()];
   */
  iterTables(): Iterable<Table> {
    return getIterable(() => this._tables);
  }

  lineAtIndex(ix: number): Line {
    if (ix < 0 || ix >= this._lines.length) {
      throw new Error(`Line index ${ix} must be >=0 and <${this._lines.length}`);
    }
    return this._lines[ix];
  }

  listBlocks(): ApiBlock[] {
    return this._blocks.slice();
  }

  listLines(): Line[] {
    return this._lines.slice();
  }

  listTables(): Table[] {
    return this._tables.slice();
  }

  tableAtIndex(ix: number): Table {
    if (ix < 0 || ix >= this._tables.length) {
      throw new Error(`Table index ${ix} must be >=0 and <${this._tables.length}`);
    }
    return this._tables[ix];
  }

  get form(): Form {
    return this._form;
  }
  get geometry(): Geometry<ApiPageBlock, Page> {
    return this._geometry;
  }
  get nLines(): number {
    return this._lines.length;
  }
  get nTables(): number {
    return this._tables.length;
  }
  get parentDocument(): TextractDocument {
    return this._parentDocument;
  }
  get text(): string {
    return this._lines.map((l) => l.text).join("\n");
  }

  str(): string {
    return `Page\n==========\n${this._content.join("\n")}\n`;
  }
}

export class TextractDocument extends ApiObjectWrapper<ApiResponsePage & ApiResponseWithContent> {
  _blockMap: { [blockId: string]: ApiBlock };
  _pages: Page[];

  /**
   * @param textractResults A (parsed) Textract response JSON, or an array of multiple from the same job
   */
  constructor(textractResults: ApiResponsePage | ApiResponsePages) {
    let dict;
    if (Array.isArray(textractResults)) {
      dict = TextractDocument._consolidateMultipleResponses(textractResults);
    } else {
      if (!("Blocks" in textractResults && textractResults.Blocks?.length)) {
        throw new Error(`Provided Textract JSON has no content! (.Blocks array)`);
      }
      dict = textractResults;
    }
    super(dict);

    if ("NextToken" in this._dict) {
      console.warn(`Provided Textract JSON contains a NextToken: Content may be truncated!`);
    }

    this._blockMap = {};
    this._pages = [];
    this._parse();
  }

  _parse(): void {
    this._blockMap = this._dict.Blocks.reduce((acc, next) => {
      acc[next.Id] = next;
      return acc;
    }, {} as { [blockId: string]: ApiBlock });

    let currentPageBlock: ApiPageBlock | null = null;
    let currentPageContent: ApiBlock[] = [];
    this._pages = [];
    this._dict.Blocks.forEach((block) => {
      if (block.BlockType == ApiBlockType.Page) {
        if (currentPageBlock) {
          this._pages.push(new Page(currentPageBlock, currentPageContent, this));
        }
        currentPageBlock = block;
        currentPageContent = [block];
      } else {
        currentPageContent.push(block);
      }
    });
    if (currentPageBlock) {
      this._pages.push(new Page(currentPageBlock, currentPageContent, this));
    }
  }

  static _consolidateMultipleResponses(
    textractResultArray: ApiResponsePages
  ): ApiResponsePage & ApiResponseWithContent {
    if (!textractResultArray?.length) throw new Error(`Input Textract Results list empty!`);
    let nPages = 0;
    const docMetadata: ApiDocumentMetadata = { Pages: 0 };
    let blocks: ApiBlock[] = [];
    let modelVersion = "";
    let analysisType: null | "AnalyzeDocument" | "DetectText" = null;
    let jobStatus: null | "IN_PROGRESS" | "SUCCEEDED" | "PARTIAL_SUCCESS" = null;
    let jobStatusMessage: null | string = null;
    let warnings: null | ApiResultWarning[] = null;
    for (const textractResult of textractResultArray) {
      if ("Blocks" in textractResult && textractResult.Blocks) {
        blocks = blocks.concat(textractResult.Blocks);
      } else {
        console.warn("Found Textract response with no content");
      }
      if ("DocumentMetadata" in textractResult) {
        Object.assign(docMetadata, textractResult["DocumentMetadata"]);
        nPages = Math.max(nPages, textractResult.DocumentMetadata.Pages);
      }
      if ("AnalyzeDocumentModelVersion" in textractResult) {
        if (analysisType && analysisType !== "AnalyzeDocument") {
          throw new Error("Inconsistent textractResults contain both AnalyzeDocument and DetectText results");
        }
        analysisType = "AnalyzeDocument";
        if (modelVersion && modelVersion !== textractResult.AnalyzeDocumentModelVersion) {
          console.warn(
            `Inconsistent Textract model versions ${modelVersion} and ${textractResult.AnalyzeDocumentModelVersion}: Ignoring latter`
          );
        } else {
          modelVersion = textractResult.AnalyzeDocumentModelVersion;
        }
      }
      if ("DetectDocumentTextModelVersion" in textractResult) {
        if (analysisType && analysisType !== "DetectText") {
          throw new Error("Inconsistent textractResults contain both AnalyzeDocument and DetectText results");
        }
        analysisType = "DetectText";
        if (modelVersion && modelVersion !== textractResult.DetectDocumentTextModelVersion) {
          console.warn(
            `Inconsistent Textract model versions ${modelVersion} and ${textractResult.DetectDocumentTextModelVersion}: Ignoring latter`
          );
        } else {
          modelVersion = textractResult.DetectDocumentTextModelVersion;
        }
      }
      if ("JobStatus" in textractResult) {
        if (
          textractResult.JobStatus == "FAILED" ||
          (textractResult.JobStatus || "").toLocaleUpperCase().indexOf("FAIL") >= 0
        ) {
          throw new Error(`Textract results contain failed job of status ${textractResult.JobStatus}`);
        } else if (jobStatus && jobStatus !== textractResult.JobStatus) {
          throw new Error(
            `Textract results inconsistent JobStatus values ${jobStatus}, ${textractResult.JobStatus}`
          );
        }
        jobStatus = textractResult.JobStatus;
      }
      if ("StatusMessage" in textractResult && textractResult.StatusMessage) {
        if (jobStatusMessage && textractResult.StatusMessage !== jobStatusMessage) {
          console.warn(`Multiple StatusMessages in Textract results - keeping longest`);
          if (textractResult.StatusMessage.length > jobStatusMessage.length) {
            jobStatusMessage = textractResult.StatusMessage;
          }
        } else {
          jobStatusMessage = textractResult.StatusMessage;
        }
      }
      if ("Warnings" in textractResult && textractResult.Warnings) {
        warnings = warnings ? warnings.concat(textractResult.Warnings) : textractResult.Warnings;
      }
    }

    const content: ApiResponseWithContent = {
      DocumentMetadata: docMetadata,
      Blocks: blocks,
    };
    const modelVersionFields =
      analysisType == "AnalyzeDocument"
        ? { AnalyzeDocumentModelVersion: modelVersion }
        : analysisType == "DetectText"
        ? { DetectDocumentTextModelVersion: modelVersion }
        : { AnalyzeDocumentModelVersion: modelVersion || "Unknown" };
    const jobStatusFields = jobStatus ? { JobStatus: jobStatus } : {};
    const statusMessageFields = jobStatusMessage ? { StatusMessage: jobStatusMessage } : {};
    const warningFields = warnings ? { ArfBarf: warnings } : {};

    return {
      ...content,
      ...modelVersionFields,
      ...jobStatusFields,
      ...statusMessageFields,
      ...warningFields,
    };
  }

  get nPages(): number {
    return this._pages.length;
  }

  getBlockById(blockId: string): ApiBlock | undefined {
    return this._blockMap && this._blockMap[blockId];
  }

  /**
   * Iterate through the pages of the document
   * @example
   * for (const page of doc.iterPages()) {
   *   console.log(page.str());
   * }
   * @example
   * const pages = [...doc.iterPages()];
   */
  iterPages(): Iterable<Page> {
    return getIterable(() => this._pages);
  }

  listBlocks(): ApiBlock[] {
    return this._dict.Blocks.slice();
  }

  listPages(): Page[] {
    return this._pages.slice();
  }

  pageNumber(pageNum: number): Page {
    if (!(pageNum >= 1 && pageNum <= this._pages.length)) {
      throw new Error(`pageNum ${pageNum} must be between 1 and ${this._pages.length}`);
    }
    return this._pages[pageNum - 1];
  }

  str(): string {
    return `\nDocument\n==========\n${this._pages.map((p) => p.str()).join("\n\n")}\n\n`;
  }
}
