/**
 * Amazon Textract API models (TypeScript interfaces) used by the response parser.

 * While these models should correspond fairly closely to those in the actual typings for the
 * @aws-sdk/client-textract module, there may be some cases where we can be more specific and
 * maintaining lets us avoid introducing dependencies of the AWS SDK for JS.
 */

export interface ApiBoundingBox {
  Height: number;
  Left: number;
  Top: number;
  Width: number;
}

export interface ApiPoint {
  X: number;
  Y: number;
}

export interface ApiGeometry {
  BoundingBox: ApiBoundingBox;
  Polygon: ApiPoint[];
}

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

export const enum ApiJobStatus {
  Failed = "FAILED",
  InProgress = "IN_PROGRESS",
  PartialSuccess = "PARTIAL_SUCCESS",
  Succeeded = "SUCCEEDED",
}

export interface ApiDocumentMetadata {
  Pages: number;
}

export interface ApiResponseWithContent {
  Blocks: ApiBlock[];
  DocumentMetadata: ApiDocumentMetadata;
}

export interface ApiAnalyzeDocumentResponse extends ApiResponseWithContent {
  AnalyzeDocumentModelVersion: string;
  HumanLoopActivationOutput?: {
    HumanLoopActivationConditionsEvaluationResults: string;
    HumanLoopActivationReasons: string[];
    HumanLoopArn: string;
  };
}

export interface ApiDetectDocumentTextResponse extends ApiResponseWithContent {
  DetectDocumentTextModelVersion: string;
}

export interface ApiAsyncJobOuputInProgress {
  JobStatus: "IN_PROGRESS";
  StatusMessage?: string; // If not completed
  Warnings?: [
    {
      ErrorCode: string;
      Pages: number[];
    }
  ];
}

export interface ApiResultWarning {
  ErrorCode: string;
  Pages: number[];
}

export interface ApiAsyncJobOuputSucceded extends ApiResponseWithContent {
  JobStatus: "SUCCEEDED";
  NextToken?: string;
  StatusMessage?: string;
  Warnings?: ApiResultWarning[];
}

export interface ApiAsyncJobOutputPartialSuccess extends ApiResponseWithContent {
  JobStatus: "PARTIAL_SUCCESS";
  NextToken?: string;
  StatusMessage?: string;
  Warnings?: ApiResultWarning[];
}

export interface ApiAsyncJobOutputFailed {
  JobStatus: "FAILED";
  NextToken?: string;
  StatusMessage?: string;
  Warnings?: ApiResultWarning[];
}

export type ApiAsyncDocumentAnalysis =
  | ApiAsyncJobOuputInProgress
  | ({ AnalyzeDocumentModelVersion: string } & (
      | ApiAsyncJobOutputFailed
      | ApiAsyncJobOutputPartialSuccess
      | ApiAsyncJobOuputSucceded
    ));

export type ApiAsyncDocumentTextDetection =
  | ApiAsyncJobOuputInProgress
  | ({ DetectDocumentTextModelVersion: string } & (
      | ApiAsyncJobOutputFailed
      | ApiAsyncJobOutputPartialSuccess
      | ApiAsyncJobOuputSucceded
    ));

export type ApiResponsePage =
  | ApiAnalyzeDocumentResponse
  | ApiAsyncDocumentAnalysis
  | ApiAsyncDocumentTextDetection
  | ApiDetectDocumentTextResponse;

export type ApiResponsePages =
  | ApiAnalyzeDocumentResponse[]
  | ApiAsyncDocumentAnalysis[]
  | ApiAsyncDocumentTextDetection[]
  | ApiDetectDocumentTextResponse[];
