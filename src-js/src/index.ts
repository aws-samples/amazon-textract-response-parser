// Local Dependencies:
import * as textract from "./api-models";

// Re-export the API types that users will most likely need to reference (for inputs):
export { ApiResponsePage, ApiResponsePages } from "./api-models";

/**
 * Base class for all classes which wrap over an actual Textract API object.
 *
 * Exposes the underlying object for access as `dict`.
 */
export class ApiObjectWrapper<T> {
  _dict: T;

  constructor(dict: T) {
    this._dict = dict;
  }

  get dict(): T {
    return this._dict;
  }
}

export class ApiBlockWrapper<T extends textract.ApiBlock> extends ApiObjectWrapper<T> {
  get id(): string {
    return this._dict.Id;
  }
}

export class BoundingBox<
  TParentBlock extends textract.ApiBlock,
  TParent extends ApiBlockWrapper<TParentBlock>
> extends ApiObjectWrapper<textract.ApiBoundingBox> {
  _parentGeometry: Geometry<TParentBlock, TParent> | null;

  constructor(dict: textract.ApiBoundingBox, parentGeometry: Geometry<TParentBlock, TParent> | null = null) {
    super(dict);
    this._parentGeometry = parentGeometry;
  }

  get bottom(): number {
    return this.top + this.height;
  }
  get hCenter(): number {
    return this.left + this.width / 2;
  }
  get height(): number {
    return this._dict.Height;
  }
  get left(): number {
    return this._dict.Left;
  }
  get parentGeometry(): Geometry<TParentBlock, TParent> | null {
    return this._parentGeometry;
  }
  get top(): number {
    return this._dict.Top;
  }
  get right(): number {
    return this.left + this.width;
  }
  get vCenter(): number {
    return this.top + this.height / 2;
  }
  get width(): number {
    return this._dict.Width;
  }

  /**
   * Calculate the minimum box enclosing both this and `other`.
   * @returns A new BoundingBox object with null `parentGeometry`.
   */
  union(
    other: BoundingBox<textract.ApiBlock, ApiBlockWrapper<textract.ApiBlock>>
  ): BoundingBox<textract.ApiBlock, ApiBlockWrapper<textract.ApiBlock>> {
    const left = Math.min(this.left, other.left);
    const top = Math.min(this.top, other.top);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    return new BoundingBox(
      {
        Height: bottom - top,
        Left: left,
        Top: top,
        Width: right - left,
      },
      null
    );
  }

  str(): string {
    return `width: ${this._dict.Width}, height: ${this._dict.Height}, left: ${this._dict.Left}, top: ${this._dict.Top}`;
  }
}

export class Point<
  TParentBlock extends textract.ApiBlock,
  TParent extends ApiBlockWrapper<TParentBlock>
> extends ApiObjectWrapper<textract.ApiPoint> {
  _parentGeometry: Geometry<TParentBlock, TParent> | null;

  constructor(dict: textract.ApiPoint, parentGeometry: Geometry<TParentBlock, TParent> | null = null) {
    super(dict);
    this._parentGeometry = parentGeometry;
  }

  get parentGeometry(): Geometry<TParentBlock, TParent> | null {
    return this._parentGeometry;
  }
  get x(): number {
    return this._dict.X;
  }
  get y(): number {
    return this._dict.Y;
  }

  str(): string {
    return `x: ${this._dict.X}, y: ${this._dict.Y}`;
  }
}

export class Geometry<
  TParentBlock extends textract.ApiBlock,
  TParent extends ApiBlockWrapper<TParentBlock>
> extends ApiObjectWrapper<textract.ApiGeometry> {
  _boundingBox: BoundingBox<TParentBlock, TParent>;
  _parentObject: TParent | null;
  _polygon: Point<TParentBlock, TParent>[];

  constructor(dict: textract.ApiGeometry, parentObject: TParent | null) {
    super(dict);
    this._parentObject = parentObject;
    this._boundingBox = new BoundingBox(dict.BoundingBox, this);
    this._polygon = dict.Polygon.map((pnt) => new Point(pnt, this));
  }

  get boundingBox(): BoundingBox<TParentBlock, TParent> {
    return this._boundingBox;
  }
  get parentObject(): TParent | null {
    return this._parentObject;
  }
  get polygon(): Point<TParentBlock, TParent>[] {
    return this._polygon.slice();
  }

  /**
   * Get the slope (in radians -pi < x +pi) of the initial segment of the polygon.
   *
   * Because Textract constructs polygons with first two points as T-L and T-R corners, this yields the
   * approximate (since it might not be completely rectangular) orientation of the object.
   */
  orientationRadians(): number | null {
    if (!this._polygon || this._polygon.length < 2) return null;
    const point0 = this._polygon[0];
    const point1 = this._polygon[1];
    return Math.atan2(point1.y - point0.y, point1.x - point0.x);
  }

  /**
   * Wrapper over orientationRadians to translate result to degrees (-180 < x < 180).
   */
  orientationDegrees(): number | null {
    const rads = this.orientationRadians();
    if (rads == null) return rads;
    return (rads * 180) / Math.PI;
  }

  str(): string {
    return `BoundingBox: ${this._boundingBox.str()}`;
  }
}

export class Word extends ApiBlockWrapper<textract.ApiWordBlock> {
  _geometry: Geometry<textract.ApiWordBlock, Word>;

  constructor(block: textract.ApiWordBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<textract.ApiWordBlock, Word> {
    return this._geometry;
  }
  get text(): string {
    return this._dict.Text;
  }
  get textType(): textract.ApiTextType {
    return this._dict.TextType;
  }
  set textType(newVal: textract.ApiTextType) {
    this._dict.TextType = newVal;
  }

  str(): string {
    return this.text;
  }
}

export class Line extends ApiBlockWrapper<textract.ApiLineBlock> {
  _geometry: Geometry<textract.ApiLineBlock, Line>;
  _parentPage: Page;
  _words: Word[];

  constructor(block: textract.ApiLineBlock, parentPage: Page) {
    super(block);
    this._parentPage = parentPage;
    this._words = [];
    this._geometry = new Geometry(block.Geometry, this);
    const parentDocument = parentPage.parentDocument;
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == textract.ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            const wordBlock = parentDocument.getBlockById(cid);
            if (!wordBlock) {
              console.warn(`Document missing word block ${cid} referenced by line ${this.id}`);
              return;
            }
            if (wordBlock.BlockType == textract.ApiBlockType.Word)
              this._words.push(new Word(wordBlock as textract.ApiWordBlock));
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
  get geometry(): Geometry<textract.ApiLineBlock, Line> {
    return this._geometry;
  }
  get parentPage(): Page {
    return this._parentPage;
  }
  get text(): string {
    return this._dict.Text;
  }
  get words(): Word[] {
    return this._words.slice();
  }

  /**
   * Iterate through the words in this line
   * @example
   * for (const word of line.iterWords) {
   *   console.log(cell.text);
   * }
   * @example
   * [...line.iterWords()].forEach(
   *   (word) => console.log(word.text)
   * );
   */
  iterWords(): Iterable<Word> {
    const getIterator = (): Iterator<Word> => {
      let ixWord = 0;
      return {
        next: (): IteratorResult<Word> => {
          return ixWord < this._words.length
            ? {
                done: false,
                value: this._words[ixWord++],
              }
            : {
                done: true,
                value: undefined,
              };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  wordAtIndex(ix: number): Word {
    if (ix < 0 || ix >= this._words.length) {
      throw new Error(`Word index ${ix} must be >=0 and <${this._words.length}`);
    }
    return this._words[ix];
  }

  str(): string {
    return `Line\n==========\n${this._dict.Text}\nWords\n----------\n${this._words
      .map((word) => `[${word.str()}]`)
      .join("")}`;
  }
}

export class SelectionElement extends ApiBlockWrapper<textract.ApiSelectionElementBlock> {
  _geometry: Geometry<textract.ApiSelectionElementBlock, SelectionElement>;

  constructor(block: textract.ApiSelectionElementBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<textract.ApiSelectionElementBlock, SelectionElement> {
    return this._geometry;
  }
  get selectionStatus(): textract.ApiSelectionStatus {
    return this._dict.SelectionStatus;
  }
  set selectionStatus(newVal: textract.ApiSelectionStatus) {
    this._dict.SelectionStatus = newVal;
  }
}

export class FieldKey extends ApiBlockWrapper<textract.ApiKeyValueSetBlock> {
  _geometry: Geometry<textract.ApiKeyValueSetBlock, FieldKey>;
  _parentField: Field;
  _words: Word[];

  constructor(block: textract.ApiKeyValueSetBlock, parentField: Field) {
    super(block);
    this._parentField = parentField;
    this._words = [];
    this._geometry = new Geometry(block.Geometry, this);

    let childIds: string[] = [];
    (block.Relationships || []).forEach((rs) => {
      if (rs.Type == textract.ApiRelationshipType.Child) {
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
        if (block.BlockType == textract.ApiBlockType.Word) {
          this._words.push(new Word(block));
        }
      });
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  get geometry(): Geometry<textract.ApiKeyValueSetBlock, FieldKey> {
    return this._geometry;
  }
  get parentField(): Field {
    return this._parentField;
  }
  get text(): string {
    return this._words.map((w) => w.text).join(" ");
  }
  get words(): Word[] {
    return this._words.slice();
  }

  str(): string {
    return this.text;
  }
}

export class FieldValue extends ApiBlockWrapper<textract.ApiKeyValueSetBlock> {
  _content: Array<SelectionElement | Word>;
  _geometry: Geometry<textract.ApiKeyValueSetBlock, FieldValue>;
  _parentField: Field;

  constructor(valueBlock: textract.ApiKeyValueSetBlock, parentField: Field) {
    super(valueBlock);
    this._content = [];
    this._parentField = parentField;
    this._geometry = new Geometry(valueBlock.Geometry, this);

    let childIds: string[] = [];
    (valueBlock.Relationships || []).forEach((rs) => {
      if (rs.Type == textract.ApiRelationshipType.Child) {
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
        if (block.BlockType == textract.ApiBlockType.Word) {
          this._content.push(new Word(block));
        } else if (block.BlockType == textract.ApiBlockType.SelectionElement) {
          this._content.push(new SelectionElement(block));
        }
      });
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  get content(): Array<SelectionElement | Word> {
    return this._content.slice();
  }
  get geometry(): Geometry<textract.ApiKeyValueSetBlock, FieldValue> {
    return this._geometry;
  }
  get parentField(): Field {
    return this._parentField;
  }
  get text(): string {
    return this._content.map((c) => ("selectionStatus" in c ? c.selectionStatus : c.text)).join(" ");
  }

  str(): string {
    return this.text;
  }
}

export class Field {
  _key: FieldKey;
  _parentForm: Form;
  _value: FieldValue | null;

  constructor(keyBlock: textract.ApiKeyValueSetBlock, parentForm: Form) {
    this._parentForm = parentForm;
    this._value = null;

    this._key = new FieldKey(keyBlock, this);

    let valueBlockIds: string[] = [];
    (keyBlock.Relationships || []).forEach((rs) => {
      if (rs.Type == textract.ApiRelationshipType.Value) {
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
        this._value = new FieldValue(valBlock as textract.ApiKeyValueSetBlock, this);
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

  constructor(keyBlocks: textract.ApiKeyValueSetBlock[], parentPage: Page) {
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
    const getIterator = (): Iterator<Field> => {
      const fieldList = skipFieldsWithoutKey ? this._fields.filter((f) => f.key) : this._fields;
      let ixField = 0;
      return {
        next: (): IteratorResult<Field> => {
          return ixField < fieldList.length
            ? {
                done: false,
                value: fieldList[ixField++],
              }
            : {
                done: true,
                value: undefined,
              };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  searchFieldsByKey(key: string): Field[] {
    const searchKey = key.toLowerCase();
    return this._fields.filter((field) => field.key && field.key.text.toLowerCase().indexOf(searchKey) >= 0);
  }

  str(): string {
    return this._fields.map((f) => f.str()).join("\n");
  }
}

export class Cell extends ApiBlockWrapper<textract.ApiCellBlock> {
  _geometry: Geometry<textract.ApiCellBlock, Cell>;
  _content: Array<SelectionElement | Word>;
  _parentTable: Table;
  _text: string;

  constructor(block: textract.ApiCellBlock, parentTable: Table) {
    super(block);
    const parentDocument = parentTable.parentPage.parentDocument;
    this._geometry = new Geometry(block.Geometry, this);
    this._content = [];
    this._parentTable = parentTable;
    this._text = "";
    (block.Relationships || []).forEach((rs) => {
      if (rs.Type == textract.ApiRelationshipType.Child) {
        rs.Ids.forEach((cid) => {
          const childBlock = parentDocument.getBlockById(cid);
          if (!childBlock) {
            console.warn(`Document missing child block ${cid} referenced by table cell ${this.id}`);
            return;
          }
          const blockType = childBlock.BlockType;
          if (blockType == textract.ApiBlockType.Word) {
            const w = new Word(childBlock as textract.ApiWordBlock);
            this._content.push(w);
            this._text += w.text + " ";
          } else if (blockType == textract.ApiBlockType.SelectionElement) {
            const se = new SelectionElement(childBlock as textract.ApiSelectionElementBlock);
            this._content.push(se);
            this._text += se.selectionStatus + ", ";
          }
        });
      }
    });
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
  get content(): Array<SelectionElement | Word> {
    return this._content.slice();
  }
  get geometry(): Geometry<textract.ApiCellBlock, Cell> {
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
  get text(): string {
    return this._text;
  }

  str(): string {
    return this._text;
  }
}

export class Row {
  _cells: Cell[];
  _parentTable: Table;

  constructor(cells: Cell[] = [], parentTable: Table) {
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
  iterCells(): Iterable<Cell> {
    const getIterator = (): Iterator<Cell> => {
      let ixCell = 0;
      return {
        next: (): IteratorResult<Cell> => {
          return ixCell < this._cells.length
            ? {
                done: false,
                value: this._cells[ixCell++],
              }
            : {
                done: true,
                value: undefined,
              };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  str(): string {
    return this._cells.map((cell) => `[${cell.str()}]`).join("");
  }
}

export class Table extends ApiBlockWrapper<textract.ApiTableBlock> {
  _cells: Cell[];
  _geometry: Geometry<textract.ApiTableBlock, Table>;
  _nCols: number;
  _nRows: number;
  _parentPage: Page;

  constructor(block: textract.ApiTableBlock, parentPage: Page) {
    super(block);
    this._parentPage = parentPage;
    this._geometry = new Geometry(block.Geometry, this);

    const parentDocument = parentPage.parentDocument;
    this._cells = ([] as Cell[]).concat(
      ...(block.Relationships || [])
        .filter((rs) => rs.Type == textract.ApiRelationshipType.Child)
        .map(
          (rs) =>
            rs.Ids.map((cid) => {
              const cellBlock = parentDocument.getBlockById(cid);
              if (!cellBlock) {
                console.warn(`Document missing child block ${cid} referenced by table cell ${this.id}`);
                return;
              }
              return new Cell(cellBlock as textract.ApiCellBlock, this);
            }).filter((cell) => cell) as Cell[]
        )
    );

    // This indexing could be moved to a utility function if supporting more mutation operations in future:
    this._cells.sort((a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex);
    this._nCols = this._cells.reduce((acc, next) => Math.max(acc, next.columnIndex + next.columnSpan - 1), 0);
    this._nRows = this._cells.reduce((acc, next) => Math.max(acc, next.rowIndex + next.rowSpan - 1), 0);
  }

  /**
   * Get the Cell at a particular Y, X coordinate in the table.
   * @param rowIndex 1-based index of the target row in the table
   * @param columnIndex 1-based index of the target column in the table
   * @param strict Set `true` to exclude cells rowspan/colspan cells which don't *start* at the target indices.
   * @returns Cell at the specified row & column, or undefined if none is present.
   */
  cellAt(rowIndex: number, columnIndex: number, strict = false): Cell | undefined {
    if (strict) {
      return this._cells.find((c) => c.columnIndex === columnIndex && c.rowIndex === rowIndex);
    } else {
      return this._cells.find(
        (c) =>
          c.columnIndex <= columnIndex &&
          c.columnIndex + c.columnSpan > columnIndex &&
          c.rowIndex <= rowIndex &&
          c.rowIndex + c.rowSpan > rowIndex
      );
    }
  }

  /**
   * List the cells at a particular {row, column, or combination} in the table
   * @param rowIndex 1-based index of the target row in the table
   * @param columnIndex 1-based index of the target column in the table
   * @param strict Set `true` to exclude cells rowspan/colspan cells which don't *start* at the target indices.
   * @returns Cell at the specified row & column, or undefined if none is present.
   */
  cellsAt(rowIndex: number | null, columnIndex: number | null, strict = false): Cell[] {
    return this._cells.filter(
      (c) =>
        (rowIndex == null ||
          (strict ? c.rowIndex === rowIndex : c.rowIndex <= rowIndex && c.rowIndex + c.rowSpan > rowIndex)) &&
        (columnIndex == null ||
          (strict
            ? c.columnIndex === columnIndex
            : c.columnIndex <= columnIndex && c.columnIndex + c.columnSpan > columnIndex))
    );
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
          return ixRow < this._nRows
            ? {
                done: false,
                value: new Row(this.cellsAt(++ixRow, null, !repeatMultiRowCells), this),
              }
            : {
                done: true,
                value: undefined,
              };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<textract.ApiTableBlock, Table> {
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
      "Table\n==========\n" + [...this.iterRows()].map((row) => `Row\n==========\n${row.str()}`).join("\n")
    );
  }
}

/**
 * Get the most common value in an Iterable of numbers
 */
const getMode = (arr: Iterable<number>): number | null => {
  const freqs: { [key: number]: { value: number; freq: number } } = {};
  for (const item of arr) {
    if (freqs[item]) {
      ++freqs[item].freq;
    } else {
      freqs[item] = { value: item, freq: 1 };
    }
  }

  let maxFreq = 0;
  let mode: number | null = null;
  for (const item in freqs) {
    if (freqs[item].freq > maxFreq) {
      maxFreq = freqs[item].freq;
      mode = freqs[item].value;
    }
  }
  return mode;
};

export class Page extends ApiBlockWrapper<textract.ApiPageBlock> {
  _blocks: textract.ApiBlock[];
  _content: Array<Line | Table | Field>;
  _form: Form;
  _geometry: Geometry<textract.ApiPageBlock, Page>;
  _lines: Line[];
  _parentDocument: TextractDocument;
  _tables: Table[];

  constructor(
    pageBlock: textract.ApiPageBlock,
    blocks: textract.ApiBlock[],
    parentDocument: TextractDocument
  ) {
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

  _parse(blocks: textract.ApiBlock[]): void {
    this._content = [];
    this._lines = [];
    this._tables = [];
    const formKeyBlocks: textract.ApiKeyValueSetBlock[] = [];

    blocks.forEach((item) => {
      if (item.BlockType == textract.ApiBlockType.Line) {
        const l = new Line(item, this);
        this._lines.push(l);
        this._content.push(l);
      } else if (item.BlockType == textract.ApiBlockType.Table) {
        const t = new Table(item, this);
        this._tables.push(t);
        this._content.push(t);
      } else if (item.BlockType == textract.ApiBlockType.KeyValueSet) {
        if (item.EntityTypes.indexOf(textract.ApiKeyValueEntityType.Key) >= 0) {
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
    const wordDegreesByLine = [...this.iterLines()].map((line) =>
      [...line.iterWords()].map((word) => word.geometry.orientationDegrees())
    );

    const wordDegrees = ([] as Array<number | null>)
      .concat(...wordDegreesByLine)
      .filter((n) => n != null) as number[];

    return getMode(wordDegrees.map((n) => Math.round(n)));
  }

  /**
   * List lines in reading order, grouped by 'cluster' (heuristically, almost a paragraph)
   */
  getLineClustersInReadingOrder(): Line[][] {
    const colBoxes: BoundingBox<textract.ApiBlock, ApiBlockWrapper<textract.ApiBlock>>[] = [];
    const colLines: Line[][] = [];
    const colTotalLineHeight: number[] = [];
    const lineHCenters = this._lines.map((l) => l.geometry.boundingBox.hCenter);
    this._lines.forEach((line, ixLine) => {
      const lineBox = line.geometry.boundingBox;
      const lineHCenter = lineHCenters[ixLine];
      let ixColumn: number | null = null;
      for (let ixCol = 0; ixCol < colBoxes.length; ++ixCol) {
        const colBox = colBoxes[ixCol];
        const colHCenter = colBox.hCenter;
        const newTotalLineHeight = colTotalLineHeight[ixCol] + lineBox.height;
        const newAvgLineHeight = newTotalLineHeight / (colLines[ixCol].length + 1);
        // These distances can't both be >0, and will both be <0 if they overlap
        const vDist = Math.max(0, lineBox.top - colBox.bottom, colBox.top - lineBox.bottom);
        if (
          ((lineHCenter > colBox.left && lineHCenter < colBox.right) ||
            (colHCenter > lineBox.left && colHCenter < lineBox.right)) &&
          vDist < newAvgLineHeight &&
          Math.abs((newAvgLineHeight - lineBox.height) / newAvgLineHeight) < 0.3
        ) {
          ixColumn = ixCol;
          colBoxes[ixCol] = colBox.union(lineBox);
          colLines[ixCol].push(line);
          colTotalLineHeight[ixCol] = newTotalLineHeight;
          break;
        }
      }
      if (ixColumn == null) {
        colBoxes.push(new BoundingBox(lineBox.dict));
        colLines.push([line]);
        colTotalLineHeight.push(lineBox.height);
      }
    });
    return colLines;
  }

  getTextInReadingOrder(): string {
    return this.getLineClustersInReadingOrder()
      .map((lines) => lines.map((l) => l.text).join("\n"))
      .join("\n\n");
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
   * @example
   * const lines = [...page.iterLines()];
   */
  iterLines(): Iterable<Line> {
    const getIterator = (): Iterator<Line> => {
      let ixLine = 0;
      return {
        next: (): IteratorResult<Line> => {
          return ixLine < this._lines.length
            ? {
                done: false,
                value: this._lines[ixLine++],
              }
            : {
                done: true,
                value: undefined,
              };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
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
    const getIterator = (): Iterator<Table> => {
      let ixTable = 0;
      return {
        next: (): IteratorResult<Table> => {
          return ixTable < this._tables.length
            ? {
                done: false,
                value: this._tables[ixTable++],
              }
            : {
                done: true,
                value: undefined,
              };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  lineAtIndex(ix: number): Line {
    if (ix < 0 || ix >= this._lines.length) {
      throw new Error(`Line index ${ix} must be >=0 and <${this._lines.length}`);
    }
    return this._lines[ix];
  }

  tableAtIndex(ix: number): Table {
    if (ix < 0 || ix >= this._tables.length) {
      throw new Error(`Table index ${ix} must be >=0 and <${this._tables.length}`);
    }
    return this._tables[ix];
  }

  get blocks(): textract.ApiBlock[] {
    return this._blocks.slice();
  }
  get form(): Form {
    return this._form;
  }
  get geometry(): Geometry<textract.ApiPageBlock, Page> {
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

export class TextractDocument extends ApiObjectWrapper<
  textract.ApiResponsePage & textract.ApiResponseWithContent
> {
  _blockMap: { [blockId: string]: textract.ApiBlock };
  _pages: Page[];

  /**
   * @param textractResults A (parsed) Textract response JSON, or an array of multiple from the same job
   */
  constructor(textractResults: textract.ApiResponsePage | textract.ApiResponsePages) {
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
    }, {} as { [blockId: string]: textract.ApiBlock });

    let currentPageBlock: textract.ApiPageBlock | null = null;
    let currentPageContent: textract.ApiBlock[] = [];
    this._pages = [];
    this._dict.Blocks.forEach((block) => {
      if (block.BlockType == textract.ApiBlockType.Page) {
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
    textractResultArray: textract.ApiResponsePages
  ): textract.ApiResponsePage & textract.ApiResponseWithContent {
    if (!textractResultArray?.length) throw new Error(`Input Textract Results list empty!`);
    let nPages = 0;
    const docMetadata: textract.ApiDocumentMetadata = { Pages: 0 };
    let blocks: textract.ApiBlock[] = [];
    let modelVersion = "";
    let analysisType: null | "AnalyzeDocument" | "DetectText" = null;
    let jobStatus: null | "IN_PROGRESS" | "SUCCEEDED" | "PARTIAL_SUCCESS" = null;
    let jobStatusMessage: null | string = null;
    let warnings: null | textract.ApiResultWarning[] = null;
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

    const content: textract.ApiResponseWithContent = {
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

  get blocks(): textract.ApiBlock[] {
    return this._dict.Blocks;
  }
  get nPages(): number {
    return this._pages.length;
  }

  getBlockById(blockId: string): textract.ApiBlock | undefined {
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
    const getIterator = (): Iterator<Page> => {
      let ixPage = 0;
      return {
        next: (): IteratorResult<Page> => {
          return ixPage < this._pages.length
            ? {
                done: false,
                value: this._pages[ixPage++],
              }
            : {
                done: true,
                value: undefined,
              };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
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
