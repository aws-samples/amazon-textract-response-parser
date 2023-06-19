/**
 * TRP classes for (generic document) table objects
 */

// Local Dependencies:
import {
  ApiBlockType,
  ApiCellBlock,
  ApiMergedCellBlock,
  ApiRelationshipType,
  ApiSelectionElementBlock,
  ApiTableBlock,
  ApiTableCellEntityType,
  ApiTableEntityType,
  ApiWordBlock,
} from "./api-models/document";
import { aggregate, AggregationMethod, ApiBlockWrapper, getIterable, WithParentDocBlocks } from "./base";
import { SelectionElement, Word } from "./content";
import { Geometry } from "./geometry";

/**
 * Generic base class for a table cell, which may be merged or not
 *
 * If you're consuming this library, you probably just want to use `document.ts/CellBase`.
 */
export abstract class CellBaseGeneric<
  T extends ApiCellBlock | ApiMergedCellBlock,
  TPage extends WithParentDocBlocks
> extends ApiBlockWrapper<T> {
  _geometry: Geometry<T, CellBaseGeneric<T, TPage>>;
  _parentTable: TableGeneric<TPage>;

  constructor(block: T, parentTable: TableGeneric<TPage>) {
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

  /**
   * Confidence score of the table cell structure detection
   *
   * This score reflects the confidence of the model detecting the table cell structure itself. For
   * the text OCR confidence, see the `.getOcrConfidence()` method instead.
   */
  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<T, CellBaseGeneric<T, TPage>> {
    return this._geometry;
  }

  get parentTable(): TableGeneric<TPage> {
    return this._parentTable;
  }
  get rowIndex(): number {
    return this._dict.RowIndex;
  }
  get rowSpan(): number {
    return this._dict.RowSpan || 1;
  }

  /**
   * Aggregate OCR confidence score of the text (and selection elements) in this cell
   *
   * This score reflects the aggregated OCR confidence of all the text content detected in the
   * cell. For the model's confidence on the table structure itself, see `.confidence`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number {
    return aggregate(
      this.listContent().map((c) => c.confidence),
      aggMethod
    );
  }

  /**
   * Check if this cell is tagged with any of the given EntityType(s) e.g. COLUMN_HEADER, etc.
   *
   * For more information on table cell entity types returnable by Amazon Textract, see:
   * https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
   *
   * @param entityType The type to check for, or an array of multiple types to allow.
   * @returns true if the EntityType is set, null if block EntityTypes is undefined, false otherwise.
   */
  hasEntityTypes(entityType: ApiTableCellEntityType | ApiTableCellEntityType[]): boolean | null {
    if (!this._dict.EntityTypes) return null;
    if (Array.isArray(entityType)) {
      return entityType.some(
        // (Safe type cast because the block above has already returned null if Entitytypes not set)
        (eType) => (this._dict.EntityTypes as ApiTableCellEntityType[]).indexOf(eType) >= 0
      );
    }
    return this._dict.EntityTypes.indexOf(entityType) >= 0;
  }

  abstract get text(): string;
  abstract listContent(): Array<SelectionElement | Word>;
  abstract str(): string;
}

/**
 * Generic base class for a non-merged table cell (or sub-cell of a merged cell)
 *
 * If you're consuming this library, you probably just want to use `document.ts/Cell`.
 */
export class CellGeneric<TPage extends WithParentDocBlocks> extends CellBaseGeneric<ApiCellBlock, TPage> {
  _content: Array<SelectionElement | Word>;
  _text: string;

  constructor(block: ApiCellBlock, parentTable: TableGeneric<TPage>) {
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
 * Generic base class for a merged table cell (Spanning more than one row or column of the table)
 *
 * If you're consuming this library, you probably just want to use `document.ts/MergedCell`.
 */
export class MergedCellGeneric<TPage extends WithParentDocBlocks> extends CellBaseGeneric<
  ApiMergedCellBlock,
  TPage
> {
  _cells: CellGeneric<TPage>[];

  constructor(block: ApiMergedCellBlock, parentTable: TableGeneric<TPage>) {
    super(block, parentTable);

    let cells: CellGeneric<TPage>[] = [];
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

/**
 * Generic base class for a table row
 *
 * If you're consuming this library, you probably just want to use `document.ts/Row`.
 */
export class RowGeneric<TPage extends WithParentDocBlocks> {
  _cells: Array<CellGeneric<TPage> | MergedCellGeneric<TPage>>;
  _parentTable: TableGeneric<TPage>;

  constructor(
    cells: Array<CellGeneric<TPage> | MergedCellGeneric<TPage>> = [],
    parentTable: TableGeneric<TPage>
  ) {
    this._cells = cells;
    this._parentTable = parentTable;
  }

  get nCells(): number {
    return this._cells.length;
  }
  get parentTable(): TableGeneric<TPage> {
    return this._parentTable;
  }

  /**
   * Aggregate table structure confidence score of the cells in this row
   *
   * This score reflects the overall confidence of the table cell structure in this row. For the
   * actual OCR confidence of cell contents, see `.getOcrConfidence()`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual cell confidences together
   */
  getConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number {
    return aggregate(
      this._cells.map((c) => c.confidence),
      aggMethod
    );
  }

  /**
   * Aggregate OCR confidence score of the text (and selection elements) in this row
   *
   * This score reflects the aggregated OCR confidence of all the text content detected in this
   * row's cells. For the model's confidence on the table structure itself, see `.getConfidence()`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number {
    const contentConfs = ([] as number[]).concat(
      ...this._cells.map((cell) => cell.listContent().map((content) => content.confidence))
    );
    return aggregate(contentConfs, aggMethod);
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
  iterCells(): Iterable<CellGeneric<TPage> | MergedCellGeneric<TPage>> {
    return getIterable(() => this._cells);
  }

  listCells(): Array<CellGeneric<TPage> | MergedCellGeneric<TPage>> {
    return this._cells.slice();
  }

  str(): string {
    return this._cells.map((cell) => `[${cell.str()}]`).join("");
  }
}

/**
 * Generic base class for a table, since Page is not defined yet here
 *
 * If you're consuming this library, you probably just want to use `document.ts/Table`.
 */
export class TableGeneric<TPage extends WithParentDocBlocks> extends ApiBlockWrapper<ApiTableBlock> {
  _cells: CellGeneric<TPage>[];
  _cellsById: { [id: string]: CellGeneric<TPage> };
  _mergedCells: MergedCellGeneric<TPage>[];
  _geometry: Geometry<ApiTableBlock, TableGeneric<TPage>>;
  _nCols: number;
  _nRows: number;
  _parentPage: TPage;

  constructor(block: ApiTableBlock, parentPage: TPage) {
    super(block);
    this._parentPage = parentPage;
    this._geometry = new Geometry(block.Geometry, this);

    const parentDocument = parentPage.parentDocument;
    this._cells = ([] as CellGeneric<TPage>[]).concat(
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
              return new CellGeneric(cellBlock as ApiCellBlock, this);
            }).filter((cell) => cell) as CellGeneric<TPage>[]
        )
    );

    this._sortCellsByLocation(this._cells);
    // This indexing could be moved to a utility function if supporting more mutation operations in future:
    this._nCols = this._cells.reduce((acc, next) => Math.max(acc, next.columnIndex + next.columnSpan - 1), 0);
    this._nRows = this._cells.reduce((acc, next) => Math.max(acc, next.rowIndex + next.rowSpan - 1), 0);

    this._cellsById = {};
    this._updateCellsById();
    this._mergedCells = ([] as MergedCellGeneric<TPage>[]).concat(
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
              return new MergedCellGeneric(cellBlock as ApiMergedCellBlock, this);
            }).filter((cell) => cell) as MergedCellGeneric<TPage>[]
        )
    );
  }

  /**
   * Sort an array of table cells by position (row, column) in-place
   * @param cells Array of (merged or raw) cells
   */
  _sortCellsByLocation<T extends CellGeneric<TPage> | MergedCellGeneric<TPage>>(cells: Array<T>): void {
    cells.sort((a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex);
  }

  /**
   * Update this Table instance's map of (split) Cells by ID for efficient retrieval
   */
  _updateCellsById(): void {
    this._cellsById = this._cells.reduce((acc, next) => {
      acc[next.id] = next;
      return acc;
    }, {} as { [id: string]: CellGeneric<TPage> });
  }

  /**
   * Efficiently retrieve a (split) Cell in this table by Textract block ID
   *
   * This allows MergedCell objects to retrieve references to parsed Cells they wrap, instead of raw
   * ApiCellBlocks.
   * @throws (Rather than returning undefined) if the block ID is missing from the table.
   */
  _getSplitCellByBlockId(id: string): CellGeneric<TPage> {
    let result: CellGeneric<TPage> = this._cellsById[id];
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
  cellAt(
    rowIndex: number,
    columnIndex: number,
    ignoreMerged = false
  ): CellGeneric<TPage> | MergedCellGeneric<TPage> | undefined {
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
  ): Array<CellGeneric<TPage> | MergedCellGeneric<TPage>> {
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
    const result = (mergedCells as Array<CellGeneric<TPage> | MergedCellGeneric<TPage>>).concat(rawCells);
    this._sortCellsByLocation(result);
    return result;
  }

  /**
   * Aggregate OCR confidence score of the text (and selection elements) in this table
   *
   * This score reflects the aggregated OCR confidence of all the text content detected in this
   * table. For the model's confidence on the table structure itself, see `.confidence`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number {
    const contentConfs = ([] as number[]).concat(
      ...this._cells.map((cell) => cell.listContent().map((content) => content.confidence))
    );
    return aggregate(contentConfs, aggMethod);
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
  iterRows(repeatMultiRowCells = false): Iterable<RowGeneric<TPage>> {
    const getIterator = (): Iterator<RowGeneric<TPage>> => {
      let ixRow = 0;
      return {
        next: (): IteratorResult<RowGeneric<TPage>> => {
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
  listRows(repeatMultiRowCells = false): RowGeneric<TPage>[] {
    return [...Array(this._nRows).keys()].map((ixRow) => this.rowAt(ixRow + 1, repeatMultiRowCells));
  }

  /**
   * List the cells at a particular {row, column, or combination} in the table
   * @param rowIndex 1-based index of the target row in the table
   * @param repeatMultiRowCells Set `true` to include rowspan>1 cells in every `Row` they intersect with.
   */
  rowAt(rowIndex: number, repeatMultiRowCells = false): RowGeneric<TPage> {
    const allRowCells = this.cellsAt(rowIndex, null);
    return new RowGeneric(
      repeatMultiRowCells ? allRowCells : allRowCells.filter((c) => c.rowIndex === rowIndex),
      this
    );
  }

  /**
   * Confidence score of the table structure detection
   *
   * This score reflects the confidence of the model detecting the table structure itself. For the
   * combined table content OCR confidence, see the `.getOcrConfidence()` method instead.
   */
  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiTableBlock, TableGeneric<TPage>> {
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
  get parentPage(): TPage {
    return this._parentPage;
  }

  /**
   * Get the overall type (EntityType) of this table
   *
   * In the underlying Amazon Textract API, table EntityTypes is a list. In practice though, it will either
   * contain `STRUCTURED_TABLE`, or `SEMI_STRUCTURED_TABLE`, or neither.
   *
   * This dynamic property simplifies checking whether a table is structured, semi-structured, or untagged.
   *
   * @throws Error if the table block is tagged with multiple conflicting EntityTypes.
   */
  get tableType(): ApiTableEntityType | null {
    if (!this._dict.EntityTypes) return null;

    const isStructured = this._dict.EntityTypes.indexOf(ApiTableEntityType.StructuredTable) >= 0;
    const isSemiStructured = this._dict.EntityTypes.indexOf(ApiTableEntityType.SemiStructuredTable) >= 0;
    const nMatches = +isStructured + +isSemiStructured;
    if (nMatches === 0) return null;
    if (nMatches > 1) {
      throw new Error(
        `TABLE block ${this._dict.Id} EntityTypes contained multiple conflicting table types: "${this._dict.EntityTypes}"`
      );
    }
    if (isStructured) return ApiTableEntityType.StructuredTable;
    return ApiTableEntityType.SemiStructuredTable;
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
