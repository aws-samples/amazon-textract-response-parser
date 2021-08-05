/**
 * Top-level API response models used by the Textract response parser.
 *
 * These models/interfaces cover the top-level response structures as returned by Textract APIs
 */

// Local Dependencies:
import { ApiExpenseDocument } from "./expense";
import { ApiBlock } from "./document";

export const enum ApiJobStatus {
  Failed = "FAILED",
  InProgress = "IN_PROGRESS",
  PartialSuccess = "PARTIAL_SUCCESS",
  Succeeded = "SUCCEEDED",
}

export interface ApiDocumentMetadata {
  Pages: number;
}

export interface ApiAnalyzeExpenseResponse {
  DocumentMetadata: ApiDocumentMetadata;
  ExpenseDocuments: ApiExpenseDocument[];
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
