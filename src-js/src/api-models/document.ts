/**
 * Document processing Textract API models used by the Textract response parser.
 *
 * This file collects types/interfaces specific to Textract's "document" APIs (rather than Expense)
 */

// Local Dependencies:
import { ApiGeometry } from "./geometry";

export const enum ApiRelationshipType {
  Child = "CHILD",
  ComplexFeatures = "COMPLEX_FEATURES",
  MergedCell = "MERGED_CELL",
  Value = "VALUE",
}

export interface ApiRelationship {
  Ids: string[];
  Type: ApiRelationshipType;
}

export interface ApiChildRelationship extends ApiRelationship {
  Type: ApiRelationshipType.Child;
}

export interface ApiComplexFeaturesRelationship extends ApiRelationship {
  Type: ApiRelationshipType.ComplexFeatures;
}

export interface ApiMergedCellRelationship extends ApiRelationship {
  Type: ApiRelationshipType.MergedCell;
}

export interface ApiValueRelationship extends ApiRelationship {
  Type: ApiRelationshipType.Value;
}

export const enum ApiBlockType {
  Cell = "CELL",
  KeyValueSet = "KEY_VALUE_SET",
  Line = "LINE",
  MergedCell = "MERGED_CELL",
  Page = "PAGE",
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
  | ApiSelectionElementBlock
  | ApiTableBlock
  | ApiWordBlock;
