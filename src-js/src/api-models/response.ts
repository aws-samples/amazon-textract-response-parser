/**
 * Top-level API response models used by the Textract response parser.
 *
 * These models/interfaces cover the top-level response structures as returned by Textract APIs
 */

// Local Dependencies:
import { ApiExpenseDocument } from "./expense";
import { ApiIdentityDocument } from "./id";
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

export interface ApiAnalyzeIdResponse {
  readonly AnalyzeIDModelVersion: string;
  DocumentMetadata: ApiDocumentMetadata;
  IdentityDocuments: ApiIdentityDocument[];
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

interface ApiAsyncJobOutputStatus {
  JobStatus: "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "PARTIAL_SUCCESS";
  /**
   * When present, a continuation token to fetch the next section of the response
   *
   * In some cases this field can be present but set to null, as raised in
   * https://github.com/aws-samples/amazon-textract-response-parser/issues/154
   */
  NextToken?: string | null;
  StatusMessage?: string;
  Warnings?: ApiResultWarning[];
}

export interface ApiResultWarning {
  ErrorCode: string;
  Pages: number[];
}

export interface ApiAsyncJobOuputSucceded extends ApiResponseWithContent, ApiAsyncJobOutputStatus {
  JobStatus: "SUCCEEDED";
}

export interface ApiAsyncJobOutputPartialSuccess extends ApiResponseWithContent, ApiAsyncJobOutputStatus {
  JobStatus: "PARTIAL_SUCCESS";
}

export interface ApiAsyncJobOutputFailed extends ApiAsyncJobOutputStatus {
  JobStatus: "FAILED";
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
