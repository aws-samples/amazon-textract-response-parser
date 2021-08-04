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
  Value = "VALUE",
}

export interface ApiRelationship {
  Ids: string[];
  Type: ApiRelationshipType;
}

export const enum ApiBlockType {
  Cell = "CELL",
  KeyValueSet = "KEY_VALUE_SET",
  Line = "LINE",
  Page = "PAGE",
  SelectionElement = "SELECTION_ELEMENT",
  Table = "TABLE",
  Word = "WORD",
}

export interface ApiPageBlock {
  BlockType: "PAGE";
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
  EntityTypes: ApiKeyValueEntityType;
  Geometry: ApiGeometry;
  readonly Id: string;
  Relationships: ApiRelationship[];
}

export interface ApiTableBlock {
  BlockType: ApiBlockType.Table;
  Confidence: number;
  Geometry: ApiGeometry;
  readonly Id: string;
  Relationships: ApiRelationship[];
}

export interface ApiCellBlock {
  BlockType: ApiBlockType.Cell;
  ColumnIndex: number;
  ColumnSpan: number;
  Confidence: number;
  Geometry: ApiGeometry;
  readonly Id: string;
  Relationships: ApiRelationship[];
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
  | ApiPageBlock
  | ApiSelectionElementBlock
  | ApiTableBlock
  | ApiWordBlock;
