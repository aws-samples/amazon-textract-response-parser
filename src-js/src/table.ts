/**
 * TRP classes for (generic document) table objects
 */

// Local Dependencies:
import { ApiRelationship, ApiRelationshipType } from "./api-models/base";
import { ApiBlock } from "./api-models/document";
import {
  ApiCellBlock,
  ApiMergedCellBlock,
  ApiTableBlock,
  ApiTableCellEntityType,
  ApiTableEntityType,
  ApiTableFooterBlock,
  ApiTableTitleBlock,
} from "./api-models/table";
import {
  aggregate,
  AggregationMethod,
  escapeHtml,
  getIterable,
  indent,
  IBlockManager,
  IRenderable,
  PageHostedApiBlockWrapper,
  Constructor,
  IApiBlockWrapper,
  IWithParentPage,
  IWithText,
} from "./base";
import { buildWithContent, IWithContent, SelectionElement, Signature, WithWords, Word } from "./content";
import { Geometry } from "./geometry";

/**
 * Generic base class for a table cell, which may be merged or not
 *
 * (Because mixins can't implement constructor logic)
 */
class CellBaseGeneric<TBlock extends ApiCellBlock | ApiMergedCellBlock, TPage extends IBlockManager>
  extends PageHostedApiBlockWrapper<TBlock, TPage>
  implements IWithParentPage<TPage>
{
  _geometry: Geometry<TBlock, CellBaseGeneric<TBlock, TPage>>;
  _parentTable: TableGeneric<TPage>;

  constructor(block: TBlock, parentTable: TableGeneric<TPage>) {
    super(block, parentTable.parentPage);
    this._geometry = new Geometry(block.Geometry, this);
    this._parentTable = parentTable;
  }

  /**
   * Position of the cell on the input image / page
   */
  get geometry(): Geometry<TBlock, CellBaseGeneric<TBlock, TPage>> {
    return this._geometry;
  }
  /**
   * Parsed `Table` to which this cell belongs
   */
  get parentTable(): TableGeneric<TPage> {
    return this._parentTable;
  }
}

/**
 * Properties that a table cell should implement regardless whether it's merged or classic
 */
export interface ICellBaseProps {
  /**
   * 1-based index for which column this cell starts at in the table
   */
  get columnIndex(): number;
  /**
   * How many columns of the table this cell spans (if merged - otherwise always =1)
   */
  get columnSpan(): number;
  /**
   * Confidence score of the table cell structure detection
   *
   * This score reflects the confidence of the model detecting the table cell structure itself. For
   * the text OCR confidence, see the `.getOcrConfidence()` method instead.
   */
  get confidence(): number;
  set confidence(newVal: number);
  /**
   * 1-based index for which row this cell starts at in the table
   */
  get rowIndex(): number;
  /**
   * How many rows of the table this cell spans (if merged - otherwise always =1)
   */
  get rowSpan(): number;
  /**
   * Aggregate OCR confidence score of the text (and selection elements) in this cell
   *
   * This score reflects the aggregated OCR confidence of all the text content detected in the
   * cell. For the model's confidence on the table structure itself, see `.confidence`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   * @returns Aggregated confidence, or null if this cell contains no content/text
   */
  getOcrConfidence(aggMethod?: AggregationMethod): number | null;
  /**
   * Check if this cell is tagged with any of the given EntityType(s) e.g. COLUMN_HEADER, etc.
   *
   * For more information on table cell entity types returnable by Amazon Textract, see:
   * https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
   *
   * @param entityType The type to check for, or an array of multiple types to allow.
   * @returns true if the EntityType is set, null if block EntityTypes is undefined, false otherwise.
   */
  hasEntityTypes(entityType: ApiTableCellEntityType | ApiTableCellEntityType[]): boolean | null;
}

/**
 * Mixin to add basic table cell properties to a parent class
 */
function WithCellBaseProps<
  TBlock extends ApiCellBlock | ApiMergedCellBlock,
  TPage extends IBlockManager,
  T extends Constructor<
    IApiBlockWrapper<TBlock> &
      IWithContent<SelectionElement | Signature | Word> &
      IWithParentPage<TPage> &
      IWithText
  >,
>(SuperClass: T) {
  return class extends SuperClass implements ICellBaseProps, IRenderable {
    get columnIndex(): number {
      return this.dict.ColumnIndex;
    }
    get columnSpan(): number {
      return this.dict.ColumnSpan || 1;
    }

    /**
     * 0-100 based confidence score of the table cell structure detection
     *
     * This score reflects the confidence of the model detecting the table cell structure itself. For
     * the text OCR confidence, see the `.getOcrConfidence()` method instead.
     */
    get confidence(): number {
      return this.dict.Confidence;
    }
    set confidence(newVal: number) {
      this.dict.Confidence = newVal;
    }
    get rowIndex(): number {
      return this.dict.RowIndex;
    }
    get rowSpan(): number {
      return this.dict.RowSpan || 1;
    }

    /**
     * Aggregate OCR confidence score of the text (and selection elements) in this cell
     *
     * This score reflects the aggregated OCR confidence of all the text content detected in the
     * cell. For the model's confidence on the table structure itself, see `.confidence`.
     *
     * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
     * @returns Aggregated confidence, or null if this cell contains no content/text
     */
    getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number | null {
      return aggregate(
        this.listContent().map((c) => c.confidence),
        aggMethod,
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
      if (!this.dict.EntityTypes) return null;
      if (Array.isArray(entityType)) {
        return entityType.some(
          // (Safe type cast because the block above has already returned null if Entitytypes not set)
          (eType) => (this.dict.EntityTypes as ApiTableCellEntityType[]).indexOf(eType) >= 0,
        );
      }
      return this.dict.EntityTypes.indexOf(entityType) >= 0;
    }

    /**
     * Get semantic HTML of the cell as a `<th>` (if header/title EntityType) or `<td>` element
     */
    html(): string {
      const tagName = this.hasEntityTypes([
        ApiTableCellEntityType.ColumnHeader,
        ApiTableCellEntityType.SectionTitle,
        ApiTableCellEntityType.Title,
      ])
        ? "th"
        : "td";
      return indent(
        [
          "<",
          tagName,
          this.columnSpan > 1 ? ` colspan="${this.columnSpan}"` : "",
          this.rowSpan > 1 ? ` rowspan="${this.rowSpan}"` : "",
          ">",
          escapeHtml(this.text),
          `</${tagName}>`,
        ].join(""),
        { skipFirstLine: true },
      );
    }

    /**
     * The basic human-readable `str()` representation for a table cell is just the cell's text.
     */
    str(): string {
      return this.text;
    }
  };
}

/**
 * Generic base class for a non-merged table cell (or sub-cell of a merged cell)
 *
 * If you're consuming this library, you probably just want to use `document.ts/Cell`.
 */
export class CellGeneric<TPage extends IBlockManager>
  extends WithCellBaseProps(buildWithContent<SelectionElement | Signature | Word>()(CellBaseGeneric))<
    ApiCellBlock,
    TPage
  >
  implements IWithContent<SelectionElement | Signature | Word>
{
  constructor(block: ApiCellBlock, parentTable: TableGeneric<TPage>) {
    super(block, parentTable);
    this._geometry = new Geometry(block.Geometry, this);
    this.childBlockIds.forEach((cid) => {
      if (!this.parentPage.getBlockById(cid)) {
        console.warn(`Document missing child block ${cid} referenced by table cell ${this.id}`);
      }
    });
  }
}

/**
 * Generic base class for a merged table cell (Spanning more than one row or column of the table)
 *
 * If you're consuming this library, you probably just want to use `document.ts/MergedCell`.
 */
export class MergedCellGeneric<TPage extends IBlockManager> extends WithCellBaseProps(
  buildWithContent<SelectionElement | Signature | Word>()(CellBaseGeneric),
)<ApiMergedCellBlock, TPage> {
  constructor(block: ApiMergedCellBlock, parentTable: TableGeneric<TPage>) {
    super(block, parentTable);
    this._geometry = new Geometry(block.Geometry, this);
  }

  /**
   * Number of underlying (un-merged) sub-cells spanned by this merged cell
   */
  get nSubCells(): number {
    return this.listSubCells().length;
  }

  /**
   * Fetch a list of the underlying (un-merged) sub-`Cell`s spanned by this merged cell
   *
   * The returned list is a shallow-copied snapshot
   */
  listSubCells(): CellGeneric<TPage>[] {
    return this.childBlockIds.map((cid) => this.parentTable._getSplitCellByBlockId(cid));
  }

  override iterContent(): Iterable<SelectionElement | Signature | Word> {
    // iterContent needs to traverse each child CELL in turn, instead of directly scannning current
    const getIterator = (): Iterator<SelectionElement | Signature | Word> => {
      const cells = this.listSubCells();
      const tryListCellContents = (ixCell: number) =>
        cells.length > ixCell ? cells[ixCell].listContent() : [];
      let ixCurrCell = 0;
      let cellContents = tryListCellContents(ixCurrCell);
      let ixCurrItem = -1;
      return {
        next: (): IteratorResult<SelectionElement | Signature | Word> => {
          ++ixCurrItem;
          while (ixCurrItem >= cellContents.length) {
            ++ixCurrCell;
            ixCurrItem = 0;
            if (ixCurrCell >= cells.length) return { done: true, value: undefined };
            cellContents = tryListCellContents(ixCurrCell);
          }
          return { done: false, value: cellContents[ixCurrItem] };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  /**
   * List the content items in this object
   *
   * Concatenates content across all sub-cells
   */
  override listContent(): Array<SelectionElement | Signature | Word> {
    // listContent needs to traverse each child CELL in turn, instead of directly scannning current
    return ([] as Array<SelectionElement | Signature | Word>).concat(
      ...this.listSubCells().map((c) => c.listContent()),
    );
  }

  /**
   * Iterate through the sub-cells of this merged cell
   * @example
   * for (const subCell of merged.iterCells()) {
   *   console.log(subCell.str());
   * }
   * @example
   * const subCells = [...merged.iterCells()];
   */
  iterSubCells(): Iterable<CellGeneric<TPage>> {
    return getIterable(() => this.listSubCells());
  }
}

/**
 * Generic base class for a table row
 *
 * If you're consuming this library, you probably just want to use `document.ts/Row`.
 */
export class RowGeneric<TPage extends IBlockManager> {
  _cells: Array<CellGeneric<TPage> | MergedCellGeneric<TPage>>;
  _parentTable: TableGeneric<TPage>;

  constructor(
    cells: Array<CellGeneric<TPage> | MergedCellGeneric<TPage>> = [],
    parentTable: TableGeneric<TPage>,
  ) {
    this._cells = cells;
    this._parentTable = parentTable;
  }

  /**
   * Number of cells in this table row
   */
  get nCells(): number {
    return this._cells.length;
  }
  /**
   * Parsed `Table` to which this row belongs
   */
  get parentTable(): TableGeneric<TPage> {
    return this._parentTable;
  }
  /**
   * Tab-separated text from each cell in this row
   */
  get text(): string {
    return this._cells.map((cell) => cell.text).join("\t");
  }

  /**
   * Aggregate table structure confidence score of the cells in this row
   *
   * This score reflects the overall confidence of the table cell structure in this row. For the
   * actual OCR confidence of cell contents, see `.getOcrConfidence()`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual cell confidences together
   * @returns Aggregated confidence, or null if this row contains no content/text
   */
  getConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number | null {
    return aggregate(
      this._cells.map((c) => c.confidence),
      aggMethod,
    );
  }

  /**
   * Aggregate OCR confidence score of the text (and selection elements) in this row
   *
   * This score reflects the aggregated OCR confidence of all the text content detected in this
   * row's cells. For the model's confidence on the table structure itself, see `.getConfidence()`.
   *
   * @param {AggregationMethod} aggMethod How to combine individual word OCR confidences together
   * @returns Aggregated confidence, or null if this row contains no content/text
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number | null {
    const contentConfs = ([] as number[]).concat(
      ...this._cells.map((cell) => cell.listContent().map((content) => content.confidence)),
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

  /**
   * Create a snapshot list of the cells in this row
   */
  listCells(): Array<CellGeneric<TPage> | MergedCellGeneric<TPage>> {
    return this._cells.slice();
  }

  /**
   * The human-readable `str()` representation of a table row uses `[]` to wrap each cell's content
   */
  str(): string {
    return this._cells.map((cell) => `[${cell.str()}]`).join("");
  }
}

/**
 * Configuration options for listing merged & multi-spanned table cells
 */
export interface IGetCellOptions {
  /**
   * Set `true` to ignore merged cells, returning specific sub-cells. (Default `false`)
   */
  ignoreMerged?: boolean;
}

/**
 * Configuration options for listing table rows
 */
export interface IGetRowOptions {
  /**
   * Set `true` to ignore merged cells, returning specific sub-cells. (Default `false`)
   */
  ignoreMerged?: boolean;

  /**
   * Set `true` to include rowspan>1 cells in every `Row` they intersect with. (Default `false`)
   */
  repeatMultiRowCells?: boolean;
}

/**
 * Generic base class for a trailing/footer caption on a table
 *
 * If you're consuming this library, you probably just want to use `document.ts/TableFooter`.
 */
export class TableFooterGeneric<TPage extends IBlockManager>
  extends WithWords(PageHostedApiBlockWrapper)<ApiTableFooterBlock, TPage>
  implements IRenderable
{
  /**
   * 0-100 based confidence of the table structure model (separate from OCR content confidence)
   */
  get confidence(): number {
    return this._dict.Confidence;
  }

  /**
   * Semantic `html()` for a table footer is just the inner (HTML-escaped) text content
   *
   * The presence of header and/or footer will affect what element it gets wrapped in when rendering
   * an overall `Table` object.
   */
  html(): string {
    return escapeHtml(this.text);
  }

  str(): string {
    return `==== [Table footer] ====\n${this.text}\n========================`;
  }
}

/**
 * Generic base class for a leading/header caption on a table
 *
 * If you're consuming this library, you probably just want to use `document.ts/TableTitle`.
 */
export class TableTitleGeneric<TPage extends IBlockManager>
  extends WithWords(PageHostedApiBlockWrapper)<ApiTableTitleBlock, TPage>
  implements IRenderable
{
  /**
   * 0-100 based confidence of the table structure model (separate from OCR content confidence)
   */
  get confidence(): number {
    return this._dict.Confidence;
  }

  /**
   * Semantic `html()` for a table title is just the inner (HTML-escaped) text content
   *
   * The presence of header and/or footer will affect what element it gets wrapped in when rendering
   * an overall `Table` object.
   */
  html(): string {
    return escapeHtml(this.text);
  }

  str(): string {
    return `==== [Table header] ====\n${this.text}\n========================`;
  }
}

/**
 * Generic base class for a table, since Page is not defined yet here
 *
 * If you're consuming this library, you probably just want to use `document.ts/Table`.
 */
export class TableGeneric<TPage extends IBlockManager> extends PageHostedApiBlockWrapper<
  ApiTableBlock,
  TPage
> {
  _cells: CellGeneric<TPage>[];
  _cellsById: { [id: string]: CellGeneric<TPage> };
  _geometry: Geometry<ApiTableBlock, TableGeneric<TPage>>;
  _mergedCells: MergedCellGeneric<TPage>[];
  _nCols: number;
  _nRows: number;

  constructor(block: ApiTableBlock, parentPage: TPage) {
    super(block, parentPage);
    this._geometry = new Geometry(block.Geometry, this);

    this._cells = [];
    for (const rs of block.Relationships) {
      const itemBlocks = rs.Ids.map((cid) => {
        const cblk = parentPage.getBlockById(cid);
        if (!cblk) {
          console.warn(`Document missing related block ${cid} referenced by TABLE ${this.id}`);
          return;
        }
        return cblk;
      }).filter((cblk) => cblk) as ApiBlock[];

      if (rs.Type === ApiRelationshipType.Child) {
        this._cells = this._cells.concat(
          itemBlocks.map((cblk) => new CellGeneric(cblk as ApiCellBlock, this)),
        );
      } else if (rs.Type === ApiRelationshipType.TableFooter) {
        // Parsed objects will self-register with the parentPage:
        itemBlocks.map((cblk) => new TableFooterGeneric(cblk as ApiTableFooterBlock, parentPage));
      } else if (rs.Type === ApiRelationshipType.TableTitle) {
        // Parsed objects will self-register with the parentPage:
        itemBlocks.map((cblk) => new TableTitleGeneric(cblk as ApiTableTitleBlock, parentPage));
      } else if (rs.Type !== ApiRelationshipType.MergedCell) {
        // MERGED_CELL relationships are handled later - anything else is unexpected:
        console.warn(
          `TABLE ${this.id} contained a relationship of unexpected type '${
            (rs as ApiRelationship).Type
          }' which will be ignored`,
        );
      }
    }

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
              const cellBlock = parentPage.getBlockById(cid);
              if (!cellBlock) {
                // No warning needed: We'll already have issued one in the loop above
                return;
              }
              return new MergedCellGeneric(cellBlock as ApiMergedCellBlock, this);
            }).filter((cell) => cell) as MergedCellGeneric<TPage>[],
        ),
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
    this._cellsById = this._cells.reduce(
      (acc, next) => {
        acc[next.id] = next;
        return acc;
      },
      {} as { [id: string]: CellGeneric<TPage> },
    );
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
   * @param opts Configuration options for merged and multi-spanning cells
   * @returns Cell at the specified row & column, or undefined if none is present.
   */
  cellAt(
    rowIndex: number,
    columnIndex: number,
    opts: IGetCellOptions = {},
  ): CellGeneric<TPage> | MergedCellGeneric<TPage> | undefined {
    const ignoreMerged = opts.ignoreMerged || false;
    const mergedResult =
      !ignoreMerged &&
      this._mergedCells.find(
        (c) =>
          c.columnIndex <= columnIndex &&
          c.columnIndex + c.columnSpan > columnIndex &&
          c.rowIndex <= rowIndex &&
          c.rowIndex + c.rowSpan > rowIndex,
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
   * @param opts Configuration options for merged and multi-spanning cells
   * @returns Cell at the specified row & column, or undefined if none is present.
   */
  cellsAt(
    rowIndex: number | null,
    columnIndex: number | null,
    opts: IGetCellOptions = {},
  ): Array<CellGeneric<TPage> | MergedCellGeneric<TPage>> {
    const ignoreMerged = opts.ignoreMerged || false;
    const mergedCells = ignoreMerged
      ? []
      : this._mergedCells.filter(
          (c) =>
            (rowIndex == null || (c.rowIndex <= rowIndex && c.rowIndex + c.rowSpan > rowIndex)) &&
            (columnIndex == null ||
              (c.columnIndex <= columnIndex && c.columnIndex + c.columnSpan > columnIndex)),
        );
    const mergedCellChildIds = mergedCells.reduce(
      (acc, next) => {
        next.listSubCells().forEach((c) => {
          acc[c.id] = true;
        });
        return acc;
      },
      {} as { [id: string]: true },
    );
    const rawCells = this._cells.filter(
      (c) =>
        (rowIndex == null || c.rowIndex === rowIndex) &&
        (columnIndex == null || c.columnIndex === columnIndex) &&
        !(c.id in mergedCellChildIds),
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
   * @returns Aggregated confidence, or null if this table contains no content/text
   */
  getOcrConfidence(aggMethod: AggregationMethod = AggregationMethod.Mean): number | null {
    const contentConfs = ([] as number[]).concat(
      ...this._cells.map((cell) => cell.listContent().map((content) => content.confidence)),
    );
    return aggregate(contentConfs, aggMethod);
  }

  /**
   * Iterate through the footers linked to this table
   */
  iterFooters(): Iterable<TableFooterGeneric<TPage>> {
    return getIterable(() => this.listFooters());
  }

  /**
   * Iterate through the rows of the table
   * @param opts Configuration options for merged and multi-spanning cells
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
  iterRows(opts: IGetRowOptions = {}): Iterable<RowGeneric<TPage>> {
    const getIterator = (): Iterator<RowGeneric<TPage>> => {
      let ixRow = 0;
      return {
        next: (): IteratorResult<RowGeneric<TPage>> => {
          if (ixRow < this._nRows) {
            return {
              done: false,
              value: this.rowAt(++ixRow, opts),
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
   * Iterate through the titles linked to this table
   */
  iterTitles(): Iterable<TableTitleGeneric<TPage>> {
    return getIterable(() => this.listTitles());
  }

  /**
   * List the footer(s) associated with the table
   */
  listFooters(): TableFooterGeneric<TPage>[] {
    return this.relatedBlockIdsByRelType(ApiRelationshipType.TableFooter).map(
      (id) => this.parentPage.getItemByBlockId(id) as TableFooterGeneric<TPage>,
    );
  }

  /**
   * List the rows of the table
   * @param opts Configuration options for merged and multi-spanning cells
   */
  listRows(opts: IGetRowOptions = {}): RowGeneric<TPage>[] {
    return [...Array(this._nRows).keys()].map((ixRow) => this.rowAt(ixRow + 1, opts));
  }

  /**
   * List the title(s) associated with the table
   */
  listTitles(): TableTitleGeneric<TPage>[] {
    return this.relatedBlockIdsByRelType(ApiRelationshipType.TableTitle).map(
      (id) => this.parentPage.getItemByBlockId(id) as TableTitleGeneric<TPage>,
    );
  }

  /**
   * List the cells at a particular {row, column, or combination} in the table
   * @param rowIndex 1-based index of the target row in the table
   * @param opts Configuration options for merged and multi-spanning cells
   */
  rowAt(rowIndex: number, opts: IGetRowOptions = {}): RowGeneric<TPage> {
    const repeatMultiRowCells = opts.repeatMultiRowCells || false;
    const allRowCells = this.cellsAt(rowIndex, null, { ignoreMerged: opts.ignoreMerged });
    return new RowGeneric(
      repeatMultiRowCells ? allRowCells : allRowCells.filter((c) => c.rowIndex === rowIndex),
      this,
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
  /**
   * Access the first `TableFooter` associated to this table, if any
   *
   * This convenience property is provided because as far as we're aware at time of writing,
   * there's always either 0 or 1 footer linked to a table by the model - no more.
   */
  get firstFooter(): TableFooterGeneric<TPage> | undefined {
    const footers = this.listFooters();
    return footers.length ? footers[0] : undefined;
  }
  /**
   * Access the first `TableTitle` associated to this table, if any
   *
   * This convenience property is provided because as far as we're aware at time of writing,
   * there's always either 0 or 1 title linked to a table by the model - no more.
   */
  get firstTitle(): TableTitleGeneric<TPage> | undefined {
    const titles = this.listTitles();
    return titles.length ? titles[0] : undefined;
  }
  /**
   * Position of the table on the input image / page
   */
  get geometry(): Geometry<ApiTableBlock, TableGeneric<TPage>> {
    return this._geometry;
  }
  /**
   * Total number of cells in the table
   *
   * (For the total number of *sub-cells* ignoring merged cells, just use `nColumns * nRows`)
   */
  get nCells(): number {
    // Total sub-cells, plus total merged cells, minus the number of sub-cells each merge covers
    const nMergeTargets = this._mergedCells.map((mc) => mc.nSubCells).reduce((acc, next) => acc + next, 0);
    return this._cells.length + this._mergedCells.length - nMergeTargets;
  }
  /**
   * Number of columns in the table
   */
  get nColumns(): number {
    return this._nCols;
  }
  /**
   * Number of rows in the table
   */
  get nRows(): number {
    return this._nRows;
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
        `TABLE block ${this._dict.Id} EntityTypes contained multiple conflicting table types: "${this._dict.EntityTypes}"`,
      );
    }
    if (isStructured) return ApiTableEntityType.StructuredTable;
    return ApiTableEntityType.SemiStructuredTable;
  }

  /**
   * The plain text content of this table, with newlines between rows and tabs between cells
   */
  get text(): string {
    return this.listRows()
      .map((row) => row.text)
      .join("\n");
  }

  /**
   * Generate semantic HTML representation for this table
   *
   * The outer element will be a `<table>` *unless both* table title and footer elements are
   * present - because an HTML table can only have one `<caption>` child. In those cases, you'll
   * see an outer `<div class="table-wrapper">`.
   */
  html(): string {
    const rowHtmls = this.listRows().map((row) =>
      [
        "<tr>",
        indent(
          row
            .listCells()
            .map((cell) => cell.html())
            .join("\n"),
        ),
        "</tr>",
      ].join("\n"),
    );
    const titleTexts = this.listTitles().map((item) => item.html());
    const footerTexts = this.listFooters().map((item) => item.html());
    if (titleTexts.length && footerTexts.length) {
      // Need to accommodate both a title and a footer -> Use <div>s
      const titleInnerHtml =
        titleTexts.length > 1 ? titleTexts.map((text) => `<p>${text}</p>`).join("\n") : titleTexts[0];
      const footerInnerHtml =
        titleTexts.length > 1 ? titleTexts.map((text) => `<p>${text}</p>`).join("\n") : titleTexts[0];
      return [
        '<div class="table-wrapper">',
        indent(
          [
            '<div class="table-title">',
            indent(titleInnerHtml),
            "</div>",
            "<table>",
            indent(rowHtmls.join("\n")),
            "</table>",
            '<div class="table-footer">',
            indent(footerInnerHtml),
            "</div>",
          ].join("\n"),
        ),
        "</div>",
      ].join("\n");
    } else if (!(titleTexts.length || footerTexts.length)) {
      // No title or footer - just render table with content
      return `<table>\n${indent(rowHtmls.join("\n"))}\n</table>`;
    } else {
      // Only one of titles or footers is present
      const isTitle = titleTexts.length != 0;
      const captionTexts = isTitle ? titleTexts : footerTexts;
      // Only wrap caption elements in paragraph tags if there's more than one:
      const captionHtml =
        captionTexts.length > 1 ? captionTexts.map((text) => `<p>${text}</p>`).join("\n") : captionTexts[0];
      const innerHtml = [
        `<caption style="caption-side: ${isTitle ? "top" : "bottom"}">`,
        indent(captionHtml),
        "</caption>",
      ]
        .concat(rowHtmls)
        .join("\n");
      return `<table>\n${indent(innerHtml)}\n</table>`;
    }
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
 * Interface for a (`Page`-like) object that exposes a collection of tables
 */
export interface IWithTables<TPage extends IBlockManager> {
  /**
   * Iterate through the available `Table`s
   */
  iterTables(): Iterable<TableGeneric<TPage>>;
  /**
   * Fetch a snapshot of the list of `Table`s
   */
  listTables(): TableGeneric<TPage>[];
  /**
   * Fetch a particular parsed `Table` by its index
   */
  tableAtIndex(ix: number): TableGeneric<TPage>;
  /**
   * Number of `Table`s present
   */
  get nTables(): number;
}
