/**
 * Document processing Textract API models used by the Textract response parser.
 *
 * This file collects types/interfaces specific to Textract's "document" APIs (rather than Expense)
 */

// Local Dependencies:
import { ApiGeometry } from "./geometry";

export const enum ApiRelationshipType {
  Answer = "ANSWER",
  Child = "CHILD",
  ComplexFeatures = "COMPLEX_FEATURES",
  MergedCell = "MERGED_CELL",
  Value = "VALUE",
}

interface WithIds {
  Ids: string[];
}

export interface ApiAnswerRelationship extends WithIds {
  Type: ApiRelationshipType.Answer;
}

export interface ApiChildRelationship extends WithIds {
  Type: ApiRelationshipType.Child;
}

export interface ApiComplexFeaturesRelationship extends WithIds {
  Type: ApiRelationshipType.ComplexFeatures;
}

export interface ApiMergedCellRelationship extends WithIds {
  Type: ApiRelationshipType.MergedCell;
}

export interface ApiValueRelationship extends WithIds {
  Type: ApiRelationshipType.Value;
}

export type ApiRelationship =
  | ApiAnswerRelationship
  | ApiChildRelationship
  | ApiComplexFeaturesRelationship
  | ApiMergedCellRelationship
  | ApiValueRelationship;

export const enum ApiBlockType {
  Cell = "CELL",
  KeyValueSet = "KEY_VALUE_SET",
  Line = "LINE",
  MergedCell = "MERGED_CELL",
  Page = "PAGE",
  Query = "QUERY",
  QueryResult = "QUERY_RESULT",
  SelectionElement = "SELECTION_ELEMENT",
  Table = "TABLE",
  Word = "WORD",
}

export interface ApiPageBlock {
  BlockType: ApiBlockType.Page;
  Geometry: ApiGeometry;
  readonly Id: string;
}

export const enum ApiTextType {
  Handwriting = "HANDWRITING",
  Printed = "PRINTED",
}

export interface ApiWordBlock {
  BlockType: ApiBlockType.Word;
  Confidence: number;
  Geometry: ApiGeometry;
  readonly Id: string;
  Text: string;
  TextType: ApiTextType;
}

export interface ApiLineBlock {
  BlockType: ApiBlockType.Line;
  Confidence: number;
  Geometry: ApiGeometry;
  readonly Id: string;
  readonly Relationships: ApiRelationship[];
  Text: string;
}

export const enum ApiKeyValueEntityType {
  Key = "KEY",
  Value = "VALUE",
}

export interface ApiKeyValueSetBlock {
  BlockType: ApiBlockType.KeyValueSet;
  Confidence: number;
  EntityTypes: ApiKeyValueEntityType[];
  Geometry: ApiGeometry;
  readonly Id: string;
  Relationships: ApiRelationship[];
}

export const enum ApiTableEntityType {
  StructuredTable = "STRUCTURED_TABLE",
  SemiStructuredTable = "SEMI_STRUCTURED_TABLE",
}

export interface ApiTableBlock {
  BlockType: ApiBlockType.Table;
  Confidence: number;
  EntityTypes?: ApiTableEntityType[];
  Geometry: ApiGeometry;
  readonly Id: string;
  Relationships: Array<ApiChildRelationship | ApiMergedCellRelationship>;
}

export const enum ApiTableCellEntityType {
  Title = "TABLE_TITLE",
  Footer = "FOOTER",
  SectionTitle = "SECTION_TITLE",
  ColumnHeader = "COLUMN_HEADER",
  Summary = "TABLE_SUMMARY",
}

export interface ApiCellBlock {
  BlockType: ApiBlockType.Cell;
  ColumnIndex: number;
  ColumnSpan: 1;
  Confidence: number;
  EntityTypes?: ApiTableCellEntityType[];
  Geometry: ApiGeometry;
  readonly Id: string;
  Relationships?: ApiChildRelationship[];
  RowIndex: 1;
  RowSpan: number;
}

export interface ApiMergedCellBlock {
  BlockType: ApiBlockType.MergedCell;
  ColumnIndex: number;
  ColumnSpan: number;
  Confidence: number;
  EntityTypes?: ApiTableCellEntityType[];
  Geometry: ApiGeometry;
  readonly Id: string;
  Relationships: ApiChildRelationship[];
  RowIndex: number;
  RowSpan: number;
}

export interface ApiQueryBlock {
  BlockType: ApiBlockType.Query;
  readonly Id: string;
  /**
   * Page number for this query block
   *
   * When a query is applied to multiple pages, it generates several QUERY blocks in the result -
   * each the 'CHILD' of one page and each with a Page number.
   */
  Page: number;
  readonly Query: {
    Alias?: string;
    Text: string;
  };
  /**
   * Relationship links
   *
   * Relationships on this block type seem to contain only ANSWERs, and whole field appears to be
   * omitted when no anwers found on a given page.
   */
  Relationships?: ApiRelationship[];
}

export interface ApiQueryResultBlock {
  BlockType: ApiBlockType.QueryResult;
  Confidence: number;
  Geometry?: ApiGeometry;
  readonly Id: string;
  Page: number;
  Text: string;
  SearchKey: string;
}

export const enum ApiSelectionStatus {
  Selected = "SELECTED",
  NotSelected = "NOT_SELECTED",
}

export interface ApiSelectionElementBlock {
  BlockType: ApiBlockType.SelectionElement;
  Confidence: number;
  Geometry: ApiGeometry;
  readonly Id: string;
  SelectionStatus: ApiSelectionStatus;
}

export type ApiBlock =
  | ApiCellBlock
  | ApiKeyValueSetBlock
  | ApiLineBlock
  | ApiMergedCellBlock
  | ApiPageBlock
  | ApiQueryBlock
  | ApiQueryResultBlock
  | ApiSelectionElementBlock
  | ApiTableBlock
  | ApiWordBlock;
