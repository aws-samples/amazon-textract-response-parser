describe("Top-level index.ts", () => {
  it("should re-export expected public /api-models properties", () => {
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
      } = require("../../src");
      /* eslint-enable @typescript-eslint/no-unused-vars */
    }).not.toThrow();
  });

  it("should export expected public TRP components", () => {
    expect(() => {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        // base:
        ActionOnUnexpectedBlockType,
        aggregate,
        AggregationMethod,
        /**
         * @deprecated Planned for private-only: Please let us know if you have a use-case for this?
         */
        ApiBlockWrapper,
        argMax,
        DocumentMetadata,
        doesFilterAllowBlockType,
        escapeHtml,
        getIterable,
        IApiBlockWrapper,
        IBlockManager,
        IBlockTypeFilterOpts,
        IDocBlocks,
        IEscapeHtmlOpts,
        IIndentOpts,
        indent,
        IRenderable,
        IRenderOpts,
        modalAvg,
        // content:
        IWithContent,
        IWithContentMixinOptions,
        IWithWords,
        IWithWordsMixinOptions,
        SelectionElement,
        Signature,
        Word,
        // document:
        Cell,
        Field,
        FieldKey,
        FieldValue,
        Form,
        FormsComposite,
        HeaderFooterSegmentModelParams,
        HeuristicReadingOrderModelParams,
        Layout,
        LayoutFigure,
        LayoutFooter,
        LayoutHeader,
        LayoutKeyValue,
        LayoutPageNumber,
        LayoutSectionHeader,
        LayoutTable,
        LayoutText,
        LayoutTitle,
        LayoutList,
        Line,
        MergedCell,
        Page,
        QueryInstance,
        QueryInstanceCollection,
        QueryResult,
        ReadingOrderLayoutMode,
        Row,
        Table,
        TableFooter,
        TableTitle,
        TextractDocument,
        // expense:
        ExpenseComponentDetection,
        ExpenseFieldType,
        ExpenseField,
        ExpenseLineItem,
        ExpenseLineItemGroup,
        ExpenseDocument,
        TextractExpense,
        // geometry:
        BoundingBox,
        Point,
        Geometry,
        // id:
        IdDocumentType,
        IdDocumentField,
        IdDocument,
        IdFieldType,
        IdFieldValueType,
        TextractIdentity,
        // layout:
        ILayoutItem,
        // query:
        IFilterQueryOpts,
        // table:
        IWithTables,
        // eslint-disable-next-line @typescript-eslint/no-var-requires
      } = require("../../src");
      /* eslint-enable @typescript-eslint/no-unused-vars */
    }).not.toThrow();
  });
});
