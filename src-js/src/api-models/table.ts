/**
 * Table analysis Textract API models used by the Textract Response Parser.
 *
 * This file collects types/interfaces specific to the tables structure analysis functionality in
 * general document analysis:
 * https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
 */
// Local Dependencies:
import {
  ApiBlockBase,
  ApiBlockType,
  ApiChildRelationship,
  ApiMergedCellRelationship,
  ApiTableFooterRelationship,
  ApiTableTitleRelationship,
} from "./base";
import { ApiGeometry } from "./geometry";

/**
 * Enumeration of EntityTypes supported for top-level TABLE objects
 *
 * TODO: Haven't seen a clear definition yet of the deliniation between these
 */
export const enum ApiTableEntityType {
  StructuredTable = "STRUCTURED_TABLE",
  SemiStructuredTable = "SEMI_STRUCTURED_TABLE",
}

/**
 * Block representing an overall table with extracted structure
 */
export interface ApiTableBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Table;
  /**
   * 0-100 based confidence of the table identification model (separate from OCR content conf)
   */
  Confidence: number;
  /**
   * If present, defines whether this is a structured or semi-structured table
   */
  EntityTypes?: ApiTableEntityType[];
  Geometry: ApiGeometry;
  /**
   * Links to (merged or underlying) cells, titles, or footers contained within this table
   *
   * CHILD relationships point to underlying cells; MERGED_CELL to merged cells; TABLE_FOOTER and
   * TABLE_TITLE to footers and titles respectively.
   */
  Relationships: Array<
    ApiChildRelationship | ApiMergedCellRelationship | ApiTableFooterRelationship | ApiTableTitleRelationship
  >;
}

/**
 * Enumeration of EntityTypes supported for individual table cells
 */
export const enum ApiTableCellEntityType {
  Title = "TABLE_TITLE",
  Footer = "TABLE_FOOTER",
  SectionTitle = "TABLE_SECTION_TITLE",
  ColumnHeader = "COLUMN_HEADER",
  Summary = "TABLE_SUMMARY",
}

/**
 * Block representing an *underlying* cell before consideration of merged cells
 *
 * CELL blocks ignore any merged cell structure, treating the table as a uniform grid. For a more
 * human-like representation, you probably want to check for any linked MERGED_CELL entries first.
 */
export interface ApiCellBlock extends ApiBlockBase {
  BlockType: ApiBlockType.Cell;
  /**
   * 1-based index of the table column for this underlying cell
   */
  ColumnIndex: number;
  /**
   * This property is always = 1 as CELL blocks ignore merged cell structure
   */
  ColumnSpan: 1;
  /**
   * 0-100 based confidence of the table structure model (separate from OCR content confidence)
   */
  Confidence: number;
  /**
   * Metadata tagging the type of cell e.g. column header, summary, etc.
   */
  EntityTypes?: ApiTableCellEntityType[];
  Geometry: ApiGeometry; // Should always be present for CELL blocks
  /**
   * Content items (e.g. WORD, SELECTION_ELEMENT) within this underlying cell
   */
  Relationships?: ApiChildRelationship[];
  /**
   * 1-based index of the table row for this underlying cell
   */
  RowIndex: number;
  /**
   * This property is always = 1 as CELL blocks ignore merged cell structure
   */
  RowSpan: 1;
}

/**
 * Block representing a merged cell spanning multiple rows/columns of the underlying structure
 */
export interface ApiMergedCellBlock extends ApiBlockBase {
  BlockType: ApiBlockType.MergedCell;
  /**
   * 1-based index of the starting column for this merged cell
   */
  ColumnIndex: number;
  /**
   * Number of underlying table columns this cell covers
   */
  ColumnSpan: number;
  /**
   * 0-100 based confidence of the table structure model (separate from OCR content confidence)
   */
  Confidence: number;
  /**
   * Metadata tagging the type of cell e.g. column header, summary, etc.
   */
  EntityTypes?: ApiTableCellEntityType[];
  Geometry: ApiGeometry; // Should always be present for MERGED_CELL blocks
  /**
   * Underlying CELL Blocks covered by this merged cell.
   */
  Relationships: ApiChildRelationship[];
  /**
   * 1-based index of the table row for this underlying cell
   */
  RowIndex: number;
  /**
   * Number of underlying table rows this cell covers
   */
  RowSpan: number;
}

/**
 * Block representing a trailing/footer caption associated with a table
 */
export interface ApiTableFooterBlock extends ApiBlockBase {
  BlockType: ApiBlockType.TableFooter;
  /**
   * 0-100 based confidence of the table structure model (separate from OCR content confidence)
   */
  Confidence: number;
  Geometry: ApiGeometry; // Should always be present for TABLE_FOOTER blocks
  /**
   * As far as I can tell, TABLE_FOOTER blocks always link directly to WORD children (not LINE)
   */
  readonly Relationships: ApiChildRelationship[];
}

/**
 * Block representing a leading/header caption associated with a table
 */
export interface ApiTableTitleBlock extends ApiBlockBase {
  BlockType: ApiBlockType.TableTitle;
  /**
   * 0-100 based confidence of the table structure model (separate from OCR content confidence)
   */
  Confidence: number;
  Geometry: ApiGeometry; // Should always be present for TABLE_TITLE blocks
  /**
   * As far as I can tell, TABLE_TITLE blocks always link directly to WORD children (not LINE)
   */
  readonly Relationships: ApiChildRelationship[];
}
