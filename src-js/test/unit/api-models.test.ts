import { ApiBlockType, isLayoutBlockType } from "../../src/api-models";

describe("isLayoutBlockType", () => {
  it("should return true for layout block types", () => {
    expect(isLayoutBlockType(ApiBlockType.LayoutFigure)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutFooter)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutHeader)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutKeyValue)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutList)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutPageNumber)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutSectionHeader)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutTable)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutText)).toBe(true);
    expect(isLayoutBlockType(ApiBlockType.LayoutTitle)).toBe(true);
  });

  it("should return false for non-layout block types", () => {
    expect(isLayoutBlockType(ApiBlockType.Cell)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Key)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.KeyValueSet)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Line)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.MergedCell)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Page)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Query)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.QueryResult)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.SelectionElement)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Signature)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Table)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.TableFooter)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.TableTitle)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Value)).toBe(false);
    expect(isLayoutBlockType(ApiBlockType.Word)).toBe(false);
  });

  it("should return false for unknown layout block types", () => {
    expect(isLayoutBlockType("foobar" as ApiBlockType)).toBe(false);
    expect(isLayoutBlockType(true as unknown as ApiBlockType)).toBe(false);
    expect(isLayoutBlockType(undefined as unknown as ApiBlockType)).toBe(false);
    expect(isLayoutBlockType(1 as unknown as ApiBlockType)).toBe(false);
    expect(isLayoutBlockType([ApiBlockType.LayoutFigure] as unknown as ApiBlockType)).toBe(false);
  });
});

describe("api-models/index.ts", () => {
  it("should re-export expected public API properties", () => {
    expect(() => {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        // base:
        ApiAnswerRelationship,
        ApiBlockBase,
        ApiBlockType,
        ApiChildRelationship,
        ApiComplexFeaturesRelationship,
        ApiMergedCellRelationship,
        ApiRelationship,
        ApiRelationshipType,
        ApiTableFooterRelationship,
        ApiTableTitleRelationship,
        ApiValueRelationship,
        isLayoutBlockType,
        // content:
        ApiLineBlock,
        ApiSelectionStatus,
        ApiSelectionElementBlock,
        ApiSignatureBlock,
        ApiTextType,
        ApiWordBlock,
        // document:
        ApiBlock,
        ApiPageBlock,
        // expense:
        ApiExpenseComponentDetection,
        ApiExpenseDocument,
        ApiExpenseField,
        ApiExpenseFieldType,
        ApiExpenseLineItem,
        ApiExpenseLineItemGroup,
        // form:
        ApiKeyBlock,
        ApiKeyValueEntityType,
        ApiKeyValueSetBlock,
        ApiValueBlock,
        // geometry:
        ApiBoundingBox,
        ApiPoint,
        ApiGeometry,
        // id:
        ApiIdentityDocument,
        ApiIdentityDocumentField,
        ApiIdentityDocumentFieldType,
        ApiIdentityDocumentFieldValueDetection,
        // layout:
        ApiLayoutBlock,
        ApiLayoutFigureBlock,
        ApiLayoutFooterBlock,
        ApiLayoutHeaderBlock,
        ApiLayoutKeyValueBlock,
        ApiLayoutListBlock,
        ApiLayoutPageNumberBlock,
        ApiLayoutSectionHeaderBlock,
        ApiLayoutTableBlock,
        ApiLayoutTextBlock,
        ApiLayoutTitleBlock,
        // query:
        ApiQueryBlock,
        ApiQueryResultBlock,
        // response:
        ApiAnalyzeDocumentResponse,
        ApiAnalyzeExpenseResponse,
        ApiAnalyzeIdResponse,
        ApiAsyncDocumentAnalysis,
        ApiAsyncDocumentTextDetection,
        /**
         * @deprecated Backward compatibility for typo: Please use ApiAsyncJobOutputInProgress
         */
        ApiAsyncJobOuputInProgress,
        ApiAsyncJobOutputFailed,
        ApiAsyncJobOutputInProgress,
        ApiAsyncJobOutputPartialSuccess,
        ApiAsyncJobOuputSucceded,
        ApiDetectDocumentTextResponse,
        ApiDocumentMetadata,
        ApiJobStatus,
        ApiResponsePage,
        ApiResponsePages,
        ApiResponseWithContent,
        ApiResultWarning,
        // table:
        ApiCellBlock,
        ApiMergedCellBlock,
        ApiTableBlock,
        ApiTableCellEntityType,
        ApiTableEntityType,
        ApiTableFooterBlock,
        ApiTableTitleBlock,
        // eslint-disable-next-line @typescript-eslint/no-var-requires
      } = require("../../src/api-models");
      /* eslint-enable @typescript-eslint/no-unused-vars */
    }).not.toThrow();
  });
});
