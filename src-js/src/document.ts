/**
 * TRP classes for standard document/OCR results (e.g. DetectText and AnalyzeDocument)
 */

// Local Dependencies:
import { ApiBlockType, isLayoutBlockType } from "./api-models/base";
import { ApiLineBlock } from "./api-models/content";
import { ApiBlock, ApiPageBlock } from "./api-models/document";
import { ApiKeyBlock, ApiKeyValueEntityType, ApiKeyValueSetBlock } from "./api-models/form";
import { ApiLayoutBlock } from "./api-models/layout";
import { ApiQueryBlock } from "./api-models/query";
import {
  ApiDocumentMetadata,
  ApiResponsePage,
  ApiResponsePages,
  ApiResponseWithContent,
  ApiResultWarning,
} from "./api-models/response";
import {
  ApiBlockWrapper,
  ApiObjectWrapper,
  getIterable,
  IDocBlocks,
  indent,
  modalAvg,
  IBlockManager,
  IRenderable,
  IApiBlockWrapper,
} from "./base";
import { LineGeneric, SelectionElement, Signature, Word } from "./content";
import {
  FieldGeneric,
  FieldKeyGeneric,
  FieldValueGeneric,
  FormsCompositeGeneric,
  FormGeneric,
  IWithForm,
} from "./form";
import { BoundingBox, Geometry } from "./geometry";
import {
  LayoutFigureGeneric,
  LayoutFooterGeneric,
  LayoutGeneric,
  LayoutHeaderGeneric,
  LayoutItemGeneric,
  LayoutKeyValueGeneric,
  LayoutListGeneric,
  LayoutPageNumberGeneric,
  LayoutSectionHeaderGeneric,
  LayoutTableGeneric,
  LayoutTextGeneric,
  LayoutTitleGeneric,
} from "./layout";
import { QueryInstanceCollectionGeneric, QueryInstanceGeneric, QueryResultGeneric } from "./query";
import {
  CellGeneric,
  IWithTables,
  MergedCellGeneric,
  RowGeneric,
  TableFooterGeneric,
  TableGeneric,
  TableTitleGeneric,
} from "./table";

// Direct Exports:
// We don't directly export the *Generic classes here, and instead define concrete alternatives below once
// Page is defined: Because e.g. using `MergedCell` in user code is much nicer than having to put
// `MergedCellGeneric<Page>` everywhere.
export {
  /**
   * @deprecated Planned for private-only: Please let us know if you have a use-case for this?
   */
  ApiBlockWrapper,
} from "./base";
export { SelectionElement, Word } from "./content";

/**
 * How heuristic reading order methods should react to the presence of Textract Layout results
 *
 * When the `Layout` analysis is enabled in Amazon Textract, additional `LAYOUT_*` blocks are
 * generated using ML to infer the structural layout and reference reading order of the page. This
 * carries additional API charges, but is likely to produce more accurate results than our simple
 * TRP.js heuristics.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 *
 * @experimental
 */
export const enum ReadingOrderLayoutMode {
  /**
   * Use Textract Layout results for reading order when present, heuristics otherwise
   */
  Auto = "AUTO",
  /**
   * Use heuristics for reading order, even if Textract Layout results are present
   */
  IgnoreLayout = "IGNORE_LAYOUT",
  /**
   * Use Textract Layout results for reading order, throw an error if they're not available
   */
  RequireLayout = "REQUIRE_LAYOUT",
}

/**
 * @experimental
 */
export interface HeuristicReadingOrderModelParams {
  /**
   * Minimum ratio (0-1) of overlap to count a paragraph within a detected column. Applied relative
   * to the *minimum* of {paragraph width, column width}. Can set close to 1 if your columns are
   * well-defined with little skew and no hanging indents.
   */
  colHOverlapThresh?: number;
  /**
   * Minimum ratio (0-1) of intersection to count a paragraph within a detected column. Applied
   * relative to the *union* of {paragraph, column} horizontal span, and *only* when both the
   * paragraph and column contain multiple lines (since single-line paragraphs may be significantly
   * short). Can set close to 1 if your text is justified, since individual paragraphs in a column
   * should have reliably very similar widths.
   */
  colHMultilineUnionThresh?: number;
  /**
   * Maximum vertical distance, in multiples of line height, for a line to be considered eligible
   * for merging into a paragraph. 1.0 may make a sensible default. May set >1.0 if your text has
   * large spacing between lines within a paragraph, or <1.0 if your paragraphs have little
   * vertical separating space between them.
   */
  paraVDistTol?: number;
  /**
   * Maximum ratio of deviation of this line height from average line height in a paragraph, for a
   * line to be considered eligible for merging into a paragraph. Set close to 0 to encourage text
   * size changes to be represented as paragraph breaks (e.g. close-together heading/subheading).
   */
  paraLineHeightTol?: number;
  /**
   * Optional maximum indentation of a line versus previous, after which the line will be forced
   * into a new paragraph even if vertical distance is small. Set =0 to disable this behavior (for
   * e.g. with center-aligned text or where paragraphs are marked by vertical whitespace), or >0 to
   * specify paragraph indentation in terms of a multiplier on text line-height. Default 0.
   */
  paraIndentThresh?: number;
  /**
   * Whether to use Textract Layout results *instead* of heuristics for improved reading order when
   * available; or always use heuristics; or insist on Layout and throw an error if not present.
   */
  useLayout?: ReadingOrderLayoutMode;
}

/**
 * @experimental
 */
export interface HeaderFooterSegmentModelParams {
  /**
   * Cut-off maximum proportion of the page height that the header/footer must be within. Set close
   * to 0 if main content is known to start very close to the page edge, or higher to allow more
   * space for the header/footer search. Default 0.16 (16% page height).
   * @default 0.16 (16% page height)
   */
  maxMargin?: number;
  /**
   * Minimum vertical spacing between header/footer and main page content, as a proportion of
   * average local text LINE height. The header/footer will break on the first gap bigger than
   * this, working in from the edge of the page towards content. Set close to 0 if the main content
   * is known to start very close, or higher if multiple vertically-separate paragraphs/lines
   * should be captured in the header/footer. Default 0.8 (80% line height).
   * @default 0.8 (80% line height)
   */
  minGap?: number;
}

/**
 * Parsed TRP.js object for a single page in a document analysis / text detection result
 *
 * Wraps an Amazon Textract API `PAGE` Block, with utilities for analysis. You'll usually create
 * this via a `TextractDocument`, rather than directly.
 */
export class Page
  extends ApiBlockWrapper<ApiPageBlock>
  implements IBlockManager, IRenderable, IWithForm<Page>, IWithTables<Page>
{
  _blocks: ApiBlock[];
  _content: Array<LineGeneric<Page> | TableGeneric<Page> | FieldGeneric<Page>>;
  _form: FormGeneric<Page>;
  _geometry: Geometry<ApiPageBlock, Page>;
  _itemsByBlockId: {
    [blockId: string]:
      | LineGeneric<Page>
      | SelectionElement
      | Signature
      | Word
      | FieldGeneric<Page>
      | FieldValueGeneric<Page>
      | LayoutItemGeneric<Page>
      | QueryInstanceGeneric<Page>
      | QueryResultGeneric<Page>
      | TableGeneric<Page>
      | CellGeneric<Page>;
  };
  _layout: LayoutGeneric<Page>;
  _lines: LineGeneric<Page>[];
  _parentDocument: TextractDocument;
  _queries: QueryInstanceCollectionGeneric<Page>;
  _tables: TableGeneric<Page>[];

  /**
   * Create (parse) a Page object from a PAGE block and the list of other Blocks ocurring on it
   *
   * @param pageBlock The API Block object representing the PAGE itself
   * @param blocks The list of all API Blocks occurring on this Page
   * @param parentDocument The parsed TRP.js TextractDocument object the page belongs to
   */
  constructor(pageBlock: ApiPageBlock, blocks: ApiBlock[], parentDocument: TextractDocument) {
    super(pageBlock);
    this._blocks = blocks;
    this._parentDocument = parentDocument;
    this._geometry = new Geometry(pageBlock.Geometry, this);

    // Placeholders pre-parsing to keep TypeScript happy:
    this._content = [];
    this._lines = [];
    this._tables = [];
    this._form = new FormGeneric<Page>([], this);
    this._itemsByBlockId = {};
    this._layout = new LayoutGeneric<Page>([], this);
    this._queries = new QueryInstanceCollectionGeneric<Page>([], this);
    // Parse the content:
    this._parse(blocks);
  }

  _parse(blocks: ApiBlock[]): void {
    this._content = [];
    this._itemsByBlockId = {};
    this._lines = [];
    this._tables = [];
    const formKeyBlocks: Array<ApiKeyBlock | ApiKeyValueSetBlock> = [];
    const layoutBlocks: ApiLayoutBlock[] = [];
    const queryBlocks: ApiQueryBlock[] = [];

    blocks.forEach((item) => {
      if (item.BlockType == ApiBlockType.Line) {
        const l = new LineGeneric(item, this);
        this._lines.push(l);
        this._content.push(l);
        this._itemsByBlockId[l.id] = l;
      } else if (item.BlockType === ApiBlockType.Key) {
        formKeyBlocks.push(item);
      } else if (item.BlockType === ApiBlockType.KeyValueSet) {
        if (item.EntityTypes.indexOf(ApiKeyValueEntityType.Key) >= 0) {
          formKeyBlocks.push(item);
        }
      } else if (isLayoutBlockType(item.BlockType)) {
        layoutBlocks.push(item as ApiLayoutBlock);
      } else if (item.BlockType === ApiBlockType.Query) {
        queryBlocks.push(item);
      } else if (item.BlockType === ApiBlockType.SelectionElement) {
        const s = new SelectionElement(item);
        this._itemsByBlockId[s.id] = s;
      } else if (item.BlockType === ApiBlockType.Signature) {
        const sig = new Signature(item);
        this._itemsByBlockId[sig.id] = sig;
      } else if (item.BlockType === ApiBlockType.Table) {
        const t = new TableGeneric(item, this);
        this._tables.push(t);
        this._content.push(t);
        this._itemsByBlockId[t.id] = t;
      } else if (item.BlockType === ApiBlockType.Word) {
        const w = new Word(item);
        this._itemsByBlockId[w.id] = w;
      }
    });

    this._form = new FormGeneric<Page>(formKeyBlocks, this);
    this._queries = new QueryInstanceCollectionGeneric<Page>(queryBlocks, this);
    this._layout = new LayoutGeneric<Page>(layoutBlocks, this);
  }

  getBlockById(blockId: string): ApiBlock | undefined {
    return this._parentDocument.getBlockById(blockId);
  }

  getItemByBlockId(
    blockId: string,
    allowBlockTypes?: ApiBlockType | ApiBlockType[] | null,
  ):
    | Page
    | LineGeneric<Page>
    | SelectionElement
    | Signature
    | Word
    | FieldGeneric<Page>
    | FieldValueGeneric<Page>
    | LayoutItemGeneric<Page>
    | QueryInstanceGeneric<Page>
    | QueryResultGeneric<Page>
    | TableGeneric<Page>
    | CellGeneric<Page> {
    if (blockId === this.id) return this;
    const result = this._itemsByBlockId[blockId];
    if (!result) {
      throw new Error(`Missing parser item for block ID ${blockId}`);
    }
    if (allowBlockTypes) {
      const typeMatch = Array.isArray(allowBlockTypes)
        ? allowBlockTypes.indexOf(result.blockType) >= 0
        : allowBlockTypes === result.blockType;
      if (!typeMatch) {
        throw new Error(
          `Parser item for block ID ${blockId} had BlockType ${result.blockType} (expected ${allowBlockTypes})`,
        );
      }
    }
    return result;
  }

  /**
   * Calculate the most common orientation (in whole degrees) of 'WORD' content in the page.
   *
   * Returns `null` if the page contains no valid word blocks.
   */
  getModalWordOrientationDegrees(): number | null {
    const wordDegreesByLine = this.listLines().map((line) =>
      line.listWords().map((word) => word.geometry.orientationDegrees()),
    );

    const wordDegrees = ([] as Array<number | null>)
      .concat(...wordDegreesByLine)
      .filter((n) => n != null) as number[];

    return modalAvg(wordDegrees.map((n) => Math.round(n)));
  }

  /**
   * List lines in reading order, grouped by pseudo-'paragraph' and contiguous 'column'
   * @returns Nested array of text lines by column, paragraph, line
   * @private
   */
  _getLineClustersByColumn({
    colHOverlapThresh = 0.8,
    colHMultilineUnionThresh = 0.7,
    paraVDistTol = 0.7,
    paraLineHeightTol = 0.3,
    paraIndentThresh = 0,
  }: HeuristicReadingOrderModelParams = {}): LineGeneric<Page>[][][] {
    // First, assign lines to paragraphs:
    const paraBoxes: BoundingBox<ApiLineBlock, ApiObjectWrapper<ApiLineBlock>>[] = [];
    const paraLines: LineGeneric<Page>[][] = [];
    const paraTotalLineHeight: number[] = [];
    const lineHCenters = this._lines.map((l) => l.geometry.boundingBox.hCenter);
    this._lines.forEach((line, ixLine) => {
      const lineBox = line.geometry.boundingBox;
      const lineHCenter = lineHCenters[ixLine];
      // Geometries we get from Amazon Textract are bounding boxes for the detections, not necessarily
      // corrected for the inferred font size / line height. For example 'A' will be significantly taller
      // than 'a', and extreme outliers may be possible like e.g. '-'. In order to have some notion of line
      // height for grouping text to paragraphs, we'll heuristically adjust the raw boxes in special cases
      // where only a subset of small-height characters were detected:
      let isLineHeightGarbage: boolean;
      let adjLineBox: BoundingBox<unknown, ApiBlockWrapper<unknown & ApiBlock>>;
      if (!/[^.,_\s]/.test(line.text)) {
        // All low punctuation marks - line height is really a guess
        isLineHeightGarbage = true;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top - lineBox.height * 1.5,
            Left: lineBox.left,
            Height: lineBox.height * 2.5,
            Width: lineBox.width,
          },
          null,
        );
      } else if (!/[^-–—=~\s]/.test(line.text)) {
        // All low punctuation marks (e.g. just a dash?) - line height is really a guess
        isLineHeightGarbage = true;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top - lineBox.height * 0.75, // Vertically centered on previous
            Left: lineBox.left,
            Height: lineBox.height * 2.5,
            Width: lineBox.width,
          },
          null,
        );
      } else if (!/[^'"`^\s]/.test(line.text)) {
        // All high punctuation marks - line height is really a guess
        isLineHeightGarbage = true;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top,
            Left: lineBox.left,
            Height: lineBox.height * 2.5,
            Width: lineBox.width,
          },
          null,
        );
      } else if (!/[^-–—=~.,_acemnorsuvwxz+<>:;\s]/.test(line.text)) {
        // All low/mid punctuation and x-height letters - adjust line height up slightly
        isLineHeightGarbage = false;
        adjLineBox = new BoundingBox(
          {
            Top: lineBox.top - lineBox.height * 0.25,
            Left: lineBox.left,
            Height: lineBox.height * 1.25,
            Width: lineBox.width,
          },
          null,
        );
      } else {
        // Keep box as-is
        isLineHeightGarbage = false;
        adjLineBox = lineBox;
      }
      let assignedPara: number | null = null;
      for (let ixPara = 0; ixPara < paraBoxes.length; ++ixPara) {
        const paraBox = paraBoxes[ixPara];
        const paraHCenter = paraBox.hCenter;
        const nCurrParaLines = paraLines[ixPara].length;
        let newTotalLineHeight: number;
        let newAvgLineHeight: number;
        if (isLineHeightGarbage) {
          newAvgLineHeight = paraTotalLineHeight[ixPara] / nCurrParaLines; // Unchanged
          newTotalLineHeight = newAvgLineHeight * (nCurrParaLines + 1);
        } else {
          newTotalLineHeight = paraTotalLineHeight[ixPara] + adjLineBox.height;
          newAvgLineHeight = newTotalLineHeight / (nCurrParaLines + 1);
        }
        // These distances can't both be >0, and will both be <0 if they overlap
        const vDist = Math.max(0, adjLineBox.top - paraBox.bottom, paraBox.top - adjLineBox.bottom);
        let passIndentationCheck: boolean;
        if (paraIndentThresh) {
          const paraLastLine = paraLines[ixPara][nCurrParaLines - 1];
          // If paragraphs are started with indentation, we should regard paragraphs with only a single line
          // in as having a reference position offset to the left. Otherwise, just paragraph bbox:
          const paraRefLeft =
            paraLastLine.geometry.boundingBox.left -
            (nCurrParaLines === 1 ? paraIndentThresh * newAvgLineHeight : 0);
          const vIsectTop = Math.max(adjLineBox.top, paraBox.top);
          const vIsectBottom = Math.min(adjLineBox.bottom, paraBox.bottom);
          const vIsect = Math.max(0, vIsectBottom - vIsectTop);
          passIndentationCheck =
            Math.max(0, adjLineBox.left - paraRefLeft) < paraIndentThresh * newAvgLineHeight ||
            vIsect > 0.5 * adjLineBox.height;
        } else {
          passIndentationCheck = true;
        }
        if (
          // Line has good horizontal overlap with the working "paragraph":
          ((lineHCenter > paraBox.left && lineHCenter < paraBox.right) ||
            (paraHCenter > lineBox.left && paraHCenter < lineBox.right)) &&
          // Line is vertically within N line-heights of the "paragraph":
          vDist < newAvgLineHeight * paraVDistTol &&
          // Line has similar line height to the rest of the "paragraph"s text, unless the line is
          // composed of such charcters that it's height is basically meaningless:
          (isLineHeightGarbage ||
            Math.abs((newAvgLineHeight - adjLineBox.height) / newAvgLineHeight) < paraLineHeightTol) &&
          // Indentation check if enabled:
          passIndentationCheck
        ) {
          assignedPara = ixPara;
          paraBoxes[ixPara] = paraBox.union(lineBox);
          paraLines[ixPara].push(line);
          paraTotalLineHeight[ixPara] = newTotalLineHeight;
          break;
        }
      }
      if (assignedPara == null) {
        paraBoxes.push(new BoundingBox(lineBox.dict));
        paraLines.push([line]);
        paraTotalLineHeight.push(lineBox.height);
      }
    });

    // At this point we essentially have paragraphs in default order, so typically columns will be
    // interleaved. Assign the paragraphs to "columns" to correct for this:
    const colBoxes: BoundingBox<ApiLineBlock, ApiObjectWrapper<ApiLineBlock>>[] = [];
    const colParas: LineGeneric<Page>[][][] = [];
    paraLines.forEach((para, ixPara) => {
      const paraBox = paraBoxes[ixPara];
      let assignedCol: number | null = null;
      for (let ixCol = 0; ixCol < colBoxes.length; ++ixCol) {
        const colBox = colBoxes[ixCol];
        const thisColParas = colParas[ixCol];
        const vIsectTop = Math.max(colBox.top, paraBox.top);
        const vIsectBottom = Math.min(colBox.bottom, paraBox.bottom);
        const vIsect = Math.max(0, vIsectBottom - vIsectTop);
        const hIsectLeft = Math.max(colBox.left, paraBox.left);
        const hIsectRight = Math.min(colBox.right, paraBox.right);
        const hIsect = Math.max(0, hIsectRight - hIsectLeft);
        const hUnion = Math.max(colBox.right, paraBox.right) - Math.min(colBox.left, paraBox.left);
        const minWidth = Math.min(colBox.width, paraBox.width);
        const proposedColBox = colBox.union(paraBox);
        const matchingVsSingleLine =
          para.length === 1 || (thisColParas.length === 1 && thisColParas[0].length === 1);
        const paraLineHeight = paraTotalLineHeight[ixPara] / paraLines[ixPara].length;
        if (
          // Paragraph has no significant vertical overlap with the working column:
          vIsect < paraLineHeight * 0.1 &&
          // Paragraph has good horizontal overlap with the working column:
          hIsect / minWidth >= colHOverlapThresh &&
          // Multi-line paragraph should have a more stringent horizontal overlap with the working
          // column (because a single-line paragraph can be short):
          (matchingVsSingleLine || hIsect / hUnion >= colHMultilineUnionThresh) &&
          hIsect / minWidth >= colHOverlapThresh &&
          // The newly-modified column would not overlap with any other column:
          colBoxes.filter((cbox) => cbox.intersection(proposedColBox)).length === 1
        ) {
          assignedCol = ixCol;
          colBoxes[ixCol] = colBox.union(paraBox);
          colParas[ixCol].push(para);
          break;
        }
      }
      if (assignedCol == null) {
        colBoxes.push(new BoundingBox(paraBox.dict));
        colParas.push([para]);
      }
    });

    return colParas;
  }

  /**
   * List lines in reading order, grouped by 'cluster' (somewhat like a paragraph)
   *
   * By default if Amazon Textract Layout analysis was enabled for the document, this method will
   * use those results to infer separate clusters (e.g. paragraphs, headings) and arrange them in
   * expected reading order. If Layout was not analyzed service-side, this method applies local
   * heuristics to group text together into paragraphs, and then sorts paragraphs into "columns" in
   * reading order. Although parameters are exposed to customize the heuristic model, note that
   * this customization API is experimental and subject to change.
   *
   * Textract's ML-powered Layout functionality should generally work better than local heuristics,
   * but carries extra cost and in edge cases it's difficult for any method to define one "correct"
   * reading order for rich content: So can set the `useLayout` mode to ignore (or force)
   * Layout-based calculation if you need.
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   *
   * @returns Nested array of text lines by "paragraph"/element, line
   */
  getLineClustersInReadingOrder({
    colHOverlapThresh = 0.8,
    colHMultilineUnionThresh = 0.7,
    paraVDistTol = 0.7,
    paraLineHeightTol = 0.3,
    paraIndentThresh = 0,
    useLayout = ReadingOrderLayoutMode.Auto,
  }: HeuristicReadingOrderModelParams = {}): LineGeneric<Page>[][] {
    if (this.hasLayout) {
      if (useLayout !== ReadingOrderLayoutMode.IgnoreLayout) {
        return this.layout.listItems().map((item) => item.listTextLines());
      }
    } else if (useLayout === ReadingOrderLayoutMode.RequireLayout) {
      throw new Error(
        `Configured with useLayout=${useLayout}, but Amazon Textract Layout analysis results not found on page ${this.id}`,
      );
    }
    // Pass through to the private function, but flatten the result to simplify out the "columns":
    return ([] as LineGeneric<Page>[][]).concat(
      ...this._getLineClustersByColumn({
        colHOverlapThresh,
        colHMultilineUnionThresh,
        paraVDistTol,
        paraLineHeightTol,
        paraIndentThresh,
      }),
    );
  }

  /**
   * Extract all page text in approximate reading order
   *
   * By default if Amazon Textract Layout analysis was enabled for the document, this method will
   * use those results to infer separate clusters (e.g. paragraphs, headings) and arrange them in
   * expected reading order. If Layout was not analyzed service-side, this method applies local
   * heuristics to group text together into paragraphs, and then sorts paragraphs into "columns" in
   * reading order. Although parameters are exposed to customize the heuristic model, note that
   * this customization API is experimental and subject to change.
   *
   * Textract's ML-powered Layout functionality should generally work better than local heuristics,
   * but carries extra cost and in edge cases it's difficult for any method to define one "correct"
   * reading order for rich content: So can set the `useLayout` mode to ignore (or force)
   * Layout-based calculation if you need.
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   *
   * @returns Nested array of text lines by "paragraph"/element, line
   */
  getTextInReadingOrder({
    colHOverlapThresh = 0.8,
    colHMultilineUnionThresh = 0.7,
    paraVDistTol = 0.7,
    paraLineHeightTol = 0.3,
    paraIndentThresh = 0,
    useLayout = ReadingOrderLayoutMode.Auto,
  }: HeuristicReadingOrderModelParams = {}): string {
    return this.getLineClustersInReadingOrder({
      colHOverlapThresh,
      colHMultilineUnionThresh,
      paraVDistTol,
      paraLineHeightTol,
      paraIndentThresh,
      useLayout,
    })
      .map((lines) => lines.map((l) => l.text).join("\n"))
      .join("\n\n");
  }

  /**
   * Split lines of text into vertically contiguous groups, and describe the gaps between groups
   *
   * Useful for finding vertical cut-offs by looking for largest vertical gaps in a region. Note
   * that by 'contiguous' here we mean literally overlapping: small gaps are not filtered out, and
   * the iterative splitting process may cause the output order to be different from either the
   * human reading order or the Amazon Textract output order.
   *
   * @param {number} focusTop Top coordinate of the search area on the page. All lines above the
   *      search area will be compressed into one group regardless of separation.
   * @param {number} focusHeight Height of the search area on the page. All lines below the search
   *      area will be compressed into one group regardless of separation.
   * @param {Line[]} [lines] Optional array of Line objects to group. By default, the full list of
   *      lines on the page will be analyzed.
   * @returns Object with props 'lines' (the list of Lines in each group) and 'vGaps' (a
   *      list of BoundingBox objects describing the gaps between the groups). Note that this means
   *      `lines.length == vGaps.length + 1`.
   */
  _groupLinesByVerticalGaps(
    focusTop: number,
    focusHeight: number,
    lines?: LineGeneric<Page>[],
  ): { vGaps: BoundingBox<unknown, ApiObjectWrapper<unknown>>[]; lines: LineGeneric<Page>[][] } {
    // Start with one big "gap" covering the entire focus region, and iteratively split/refine it
    // from the lines of text:
    let vGaps = [
      new BoundingBox(
        {
          Top: focusTop,
          Left: this._geometry.boundingBox.left,
          Height: focusHeight,
          Width: this._geometry.boundingBox.width,
        },
        null,
      ),
    ];
    let preGapLineLists: LineGeneric<Page>[][] = [[]];
    let postLines: LineGeneric<Page>[] = [];

    (lines || this._lines).forEach((line) => {
      const lineBox = line.geometry.boundingBox;
      // Fast exit for lines not in the focus area:
      if (lineBox.top > vGaps[vGaps.length - 1].bottom) {
        postLines.push(line);
        return;
      } else if (lineBox.bottom < vGaps[0].top) {
        preGapLineLists[0].push(line);
        return;
      }

      const nextGaps = [];
      const nextPreGapLineLists = [];
      let orphanedLines: LineGeneric<Page>[] = [];
      let lineAssigned = false;
      // Loop from top to bottom, updating the vGaps per the new text line:
      for (let ixGap = 0; ixGap < vGaps.length; ++ixGap) {
        const gap = vGaps[ixGap];
        const preGapLineList = preGapLineLists[ixGap];
        const isect = lineBox.intersection(gap);
        if (!isect) {
          // This gap is preserved as-is
          nextGaps.push(gap);
          nextPreGapLineLists.push(orphanedLines.concat(preGapLineList));
          orphanedLines = [];
          continue;
        } else if (isect.top === gap.top && isect.height === gap.height) {
          // This gap is fully covered by the line: Delete it
          orphanedLines = orphanedLines.concat(preGapLineList);
          continue;
        } else if (isect.top > gap.top && isect.bottom < gap.bottom) {
          // This gap is split in two
          nextGaps.push(
            new BoundingBox(
              {
                Top: gap.top,
                Left: gap.left,
                Height: isect.top - gap.top,
                Width: gap.width,
              },
              null,
            ),
          );
          nextPreGapLineLists.push(orphanedLines.concat(preGapLineList));
          orphanedLines = [];
          nextGaps.push(
            new BoundingBox(
              {
                Top: isect.bottom,
                Left: gap.left,
                Height: gap.bottom - isect.bottom,
                Width: gap.width,
              },
              null,
            ),
          );
          nextPreGapLineLists.push([line]);
          lineAssigned = true;
        } else {
          // This gap is part-covered: Adjust it
          const preGapLines = orphanedLines.concat(preGapLineList);
          if (isect.top === gap.top) {
            // If the intersection starts at the gap top, this gap must be the one that immediately
            // follows this line:
            preGapLines.push(line);
            lineAssigned = true;
            nextGaps.push(
              new BoundingBox(
                {
                  Top: gap.top + isect.height,
                  Left: gap.left,
                  Height: gap.height - isect.height,
                  Width: gap.width,
                },
                null,
              ),
            );
          } else {
            nextGaps.push(
              new BoundingBox(
                {
                  Top: gap.top,
                  Left: gap.left,
                  Height: isect.top - gap.top,
                  Width: gap.width,
                },
                null,
              ),
            );
          }
          nextPreGapLineLists.push(preGapLines);
          orphanedLines = [];
        }
      }
      vGaps = nextGaps;
      preGapLineLists = nextPreGapLineLists;
      postLines = orphanedLines.concat(postLines);

      // If the text line was not already directly assigned to a vGap (by splitting a gap or
      // trimming its top), then find the latest gap immediately following it:
      if (!lineAssigned) {
        const followGapIx = vGaps.findIndex((gap) => gap.top >= lineBox.bottom);
        if (followGapIx < 0) {
          postLines.push(line);
        } else {
          preGapLineLists[followGapIx].push(line);
        }
      }
    });

    return {
      vGaps,
      lines: preGapLineLists.concat([postLines]),
    };
  }

  /**
   * Identify (via heuristics) the list of Lines likely to be page header or page footer.
   *
   * Output lines are not guaranteed to be sorted either in reading order or strictly in the
   * default Amazon Textract output order.
   *
   * @param {boolean} isHeader Set true for header, or false for footer.
   * @param {HeaderFooterSegmentModelParams} [config] (Experimental) heuristic configurations.
   * @param {Line[]} [fromLines] Optional array of Line objects to group. By default, the full list
   *      of lines on the page will be analyzed.
   * @returns {Line[]} Array of Lines in the relevant section.
   */
  _getHeaderOrFooterLines(
    isHeader: boolean,
    { maxMargin = 0.16, minGap = 0.8 }: HeaderFooterSegmentModelParams = {},
    fromLines?: LineGeneric<Page>[],
  ): LineGeneric<Page>[] {
    // Find contiguous vertical gaps (spaces with no LINEs) in the defined area of the page:
    const { vGaps, lines: linesByGap } = this._groupLinesByVerticalGaps(
      isHeader ? this._geometry.boundingBox.top : this._geometry.boundingBox.bottom - maxMargin,
      maxMargin,
      fromLines,
    );

    // We'll look at gaps relative to text line height, rather than absolute page size:
    // ...But need to be careful as some linesByGap (e.g. at the very edge of the page) may have
    // no text.
    const lineGroupAvgHeights: Array<number | null> = linesByGap.map((lines) =>
      lines.length ? lines.reduce((acc, l) => acc + l.geometry.boundingBox.height, 0) / lines.length : null,
    );
    const nonNullLineGroupAvgHeights = lineGroupAvgHeights.filter((h) => h) as number[];
    const defaultLineHeight =
      nonNullLineGroupAvgHeights.reduce((acc, h) => acc + h, 0) / nonNullLineGroupAvgHeights.length;
    const gapAvgLineHeights = vGaps.map((_, ixGap) => {
      const components: number[] = [];
      // Use the pre-gap section avg height if it's not null/zero:
      const preGapHeight = lineGroupAvgHeights[ixGap];
      if (preGapHeight) components.push(preGapHeight);
      // Also use the post-gap section avg height if it's not null/zero:
      const postGapHeight = lineGroupAvgHeights[ixGap + 1];
      if (postGapHeight) components.push(postGapHeight);

      if (components.length) {
        return components.reduce((acc, h) => acc + h, 0) / components.length;
      } else {
        // If neither the pre-gap nor post-gap line height are usable, take the default across all content:
        return defaultLineHeight;
      }
    });

    // Select the most likely gap in the focus area as the split between header/footer and content.
    if (isHeader) {
      // The header/content separator is the *first* gap which:
      // - Has some content on the edgeward side of it (i.e. not the gap at the very page edge)
      // - Is bigger than the minGap threshold
      const ixSplit = vGaps.findIndex(
        (gap, ixGap) =>
          (ixGap > 0 || linesByGap[ixGap].length) && gap.height >= gapAvgLineHeights[ixGap] * minGap,
      );
      return ixSplit < 0 ? [] : ([] as LineGeneric<Page>[]).concat(...linesByGap.slice(0, ixSplit + 1));
    } else {
      // For footer, apply the same process as header but working backwards from the page bottom.
      const revLinesBygap = linesByGap.slice().reverse();
      const revGapAvgLineHeights = gapAvgLineHeights.slice().reverse();
      const ixRevSplit = vGaps
        .slice()
        .reverse()
        .findIndex(
          (gap, ixGap) =>
            (ixGap > 0 || revLinesBygap[ixGap].length) && gap.height >= revGapAvgLineHeights[ixGap] * minGap,
        );
      return ixRevSplit < 0
        ? []
        : ([] as LineGeneric<Page>[]).concat(...linesByGap.slice(vGaps.length - ixRevSplit));
    }
  }

  /**
   * Identify (via heuristics) the list of Lines likely to be page footer.
   *
   * Output lines are not guaranteed to be sorted either in reading order or strictly in the
   * default Amazon Textract output order. See also getLinesByLayoutArea() for this.
   *
   * TODO: Consider updating for Textract Layout where available
   *
   * @param {HeaderFooterSegmentModelParams} [config] (Experimental) heuristic configurations.
   * @param {Line[]} [fromLines] Optional array of Line objects to group. By default, the full list
   *      of lines on the page will be analyzed.
   * @returns {Line[]} Array of Lines in the relevant section.
   */
  getFooterLines(
    config: HeaderFooterSegmentModelParams = {},
    fromLines?: LineGeneric<Page>[],
  ): LineGeneric<Page>[] {
    return this._getHeaderOrFooterLines(false, config, fromLines);
  }

  /**
   * Identify (via heuristics) the list of Lines likely to be page header.
   *
   * Output lines are not guaranteed to be sorted either in reading order or strictly in the
   * default Amazon Textract output order. See also getLinesByLayoutArea() for this.
   *
   * TODO: Consider updating for Textract Layout where available
   *
   * @param {HeaderFooterSegmentModelParams} [config] (Experimental) heuristic configurations.
   * @param {Line[]} [fromLines] Optional array of Line objects to group. By default, the full list
   *      of lines on the page will be analyzed.
   * @returns {Line[]} Array of Lines in the relevant section.
   */
  getHeaderLines(
    config: HeaderFooterSegmentModelParams = {},
    fromLines?: LineGeneric<Page>[],
  ): LineGeneric<Page>[] {
    return this._getHeaderOrFooterLines(true, config, fromLines);
  }

  /**
   * Segment page text into header, content, and footer - optionally in (approximate) reading order
   *
   * TODO: Consider updating for Textract Layout where available
   *
   * @param {boolean|HeuristicReadingOrderModelParams} [inReadingOrder=false] Set true to sort text
   *      in reading order, or leave false (the default) to use the standard Textract ouput order
   *      instead. To customize the (experimental) parameters of the reading order model, pass in a
   *      configuration object instead of true.
   * @param {HeaderFooterSegmentModelParams} [headerConfig] (Experimental) heuristic configurations
   *      for header extraction.
   * @param {HeaderFooterSegmentModelParams} [footerConfig] (Experimental) heuristic configurations
   *      for footer extraction.
   * @returns Object with .header, .content, .footer properties: Each of type Line[].
   */
  getLinesByLayoutArea(
    inReadingOrder: boolean | HeuristicReadingOrderModelParams = false,
    headerConfig: HeaderFooterSegmentModelParams = {},
    footerConfig: HeaderFooterSegmentModelParams = {},
  ): { header: LineGeneric<Page>[]; content: LineGeneric<Page>[]; footer: LineGeneric<Page>[] } {
    const sourceLines = inReadingOrder
      ? ([] as LineGeneric<Page>[]).concat(
          ...(inReadingOrder === true
            ? this.getLineClustersInReadingOrder()
            : this.getLineClustersInReadingOrder(inReadingOrder)),
        )
      : this._lines;

    const sourceLineSortOrder = sourceLines.reduce(
      (acc, next, ix) => {
        acc[next.id] = ix;
        return acc;
      },
      {} as { [id: string]: number },
    );

    const header = this._getHeaderOrFooterLines(true, headerConfig, sourceLines).sort(
      (a, b) => sourceLineSortOrder[a.id] - sourceLineSortOrder[b.id],
    );
    let usedIds = header.reduce(
      (acc, next) => {
        acc[next.id] = true;
        return acc;
      },
      {} as { [key: string]: true },
    );

    const footer = this._getHeaderOrFooterLines(
      false,
      footerConfig,
      sourceLines.filter((l) => !(l.id in usedIds)),
    ).sort((a, b) => sourceLineSortOrder[a.id] - sourceLineSortOrder[b.id]);
    usedIds = footer.reduce((acc, next) => {
      acc[next.id] = true;
      return acc;
    }, usedIds);

    return {
      header,
      content: sourceLines
        .filter((l) => !(l.id in usedIds))
        .sort((a, b) => sourceLineSortOrder[a.id] - sourceLineSortOrder[b.id]),
      footer,
    };
  }

  /**
   * Iterate through the text lines on the page in raw Textract order
   *
   * For reading order, see `.layout` or `.getLineClustersInReadingOrder` instead.
   *
   * @example
   * for (const line of page.iterLines()) {
   *   console.log(line.text);
   * }
   */
  iterLines(): Iterable<LineGeneric<Page>> {
    return getIterable(() => this._lines);
  }

  /**
   * Iterate through any signatures detected on the page
   *
   * If this Textract feature was not enabled, the iterator will be empty
   *
   * @example
   * for (const line of page.iterLines()) {
   *   console.log(line.text);
   * }
   */
  iterSignatures(): Iterable<Signature> {
    return getIterable(() => this.listSignatures());
  }

  /**
   * Iterate through the tables on the page
   *
   * If TABLES analysis was not enabled, the iterable will be empty.
   *
   * @example
   * for (const table of page.iterTables()) {
   *   console.log(table.str());
   * }
   * @example
   * const tables = [...page.iterTables()];
   */
  iterTables(): Iterable<TableGeneric<Page>> {
    return getIterable(() => this._tables);
  }

  /**
   * Fetch a particular parsed `Line` of text on the page by its index in the Textract result
   *
   * For reading order, see `.layout` or `.getLineClustersInReadingOrder` instead.
   *
   * @param ix 0-based index of the parsed Line to fetch
   * @returns The item at position `ix` in this page's list of text lines (in raw Textract order)
   * @throws If `ix` is less than 0, or gte than the number of text lines on the page
   */
  lineAtIndex(ix: number): LineGeneric<Page> {
    if (ix < 0 || ix >= this._lines.length) {
      throw new Error(`Line index ${ix} must be >=0 and <${this._lines.length}`);
    }
    return this._lines[ix];
  }

  /**
   * Fetch a snapshot of the list of all API `Block` items owned by this PAGE
   *
   * @returns (A shallow copy of) the list of raw `Block` objects
   */
  listBlocks(): ApiBlock[] {
    return this._blocks.slice();
  }

  /**
   * Fetch a snapshot of the list of all text lines on the page, in raw Textract order
   *
   * For reading order, see `.layout` or `.getLineClustersInReadingOrder` instead.
   *
   * @returns (A shallow copy of) the list of parsed `Line`s present on this page
   */
  listLines(): LineGeneric<Page>[] {
    return this._lines.slice();
  }

  /**
   * Fetch a snapshot list of any signatures detected on the page
   *
   * If this Textract feature was not enabled, the iterator will be empty
   *
   * @returns (A shallow/snapshot copy of) the list of parsed `Signature`s present on this page
   */
  listSignatures(): Signature[] {
    return this._blocks
      .filter((block) => block.BlockType === ApiBlockType.Signature)
      .map((block) => this.getItemByBlockId(block.Id) as Signature);
  }

  /**
   * Fetch a snapshot of the list of Tables present on this page
   *
   * If TABLES analysis was not enabled, will return empty list `[]`.
   *
   * @returns (A shallow copy of) the list of parsed `Table`s present on this page
   */
  listTables(): TableGeneric<Page>[] {
    return this._tables.slice();
  }

  registerParsedItem(
    blockId: string,
    item:
      | LineGeneric<Page>
      | SelectionElement
      | Word
      | FieldGeneric<Page>
      | FieldValueGeneric<Page>
      | LayoutItemGeneric<Page>
      | QueryInstanceGeneric<Page>
      | QueryResultGeneric<Page>
      | TableGeneric<Page>
      | CellGeneric<Page>,
  ): void {
    this._itemsByBlockId[blockId] = item;
  }

  /**
   * Fetch a particular parsed `Table` on the page by its index in the Textract result
   *
   * (See also `.iterTables()`, `.listTables()`)
   *
   * @param ix 0-based index of the Table to fetch
   * @returns The item at position `ix` in this page's list of tables
   * @throws If `ix` is less than 0, or gte than the number of tables on the page
   */
  tableAtIndex(ix: number): TableGeneric<Page> {
    if (ix < 0 || ix >= this._tables.length) {
      throw new Error(`Table index ${ix} must be >=0 and <${this._tables.length}`);
    }
    return this._tables[ix];
  }

  /**
   * The Textract Forms analysis result container for this page (even if the feature was disabled)
   *
   * For details see: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
   */
  get form(): FormGeneric<Page> {
    return this._form;
  }
  /**
   * Shape & position of the page relative to the input image.
   *
   * This is typically the whole [0,0]-[1,1] box (esp for digital documents e.g. PDFs), or
   * something close to it (for photographs of receipts, etc).
   */
  get geometry(): Geometry<ApiPageBlock, Page> {
    return this._geometry;
  }
  /**
   * Whether this page includes results from a Textract Layout analysis
   *
   * For details see: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  get hasLayout(): boolean {
    return this._layout.nItemsTotal > 0;
  }
  /**
   * The Textract Layout analysis result container for this page (even if the feature was disabled)
   *
   * For details see: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   */
  get layout(): LayoutGeneric<Page> {
    return this._layout;
  }
  /**
   * Number of text LINE blocks present in the page
   */
  get nLines(): number {
    return this._lines.length;
  }
  /**
   * Number of SIGNATURE blocks detected in the page (0 if Signatures analysis was not enabled)
   */
  get nSignatures(): number {
    return this.listSignatures().length;
  }
  /**
   * Number of TABLEs present in the page (0 if Tables analysis was not enabled)
   */
  get nTables(): number {
    return this._tables.length;
  }

  /**
   * 1-based page number of this Page in the parent TextractDocument
   */
  get pageNumber(): number {
    const pageIndex = this._parentDocument._pages.indexOf(this);
    if (pageIndex < 0) {
      throw new Error("parentDocument does not seem to contain this Page");
    } else {
      return pageIndex + 1;
    }
  }
  /**
   * Parsed document object to which this individual page belongs
   */
  get parentDocument(): TextractDocument {
    return this._parentDocument;
  }

  /**
   * The Textract Queries analysis result container for this page (even if the feature was disabled)
   *
   * For details see: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
   */
  get queries(): QueryInstanceCollectionGeneric<Page> {
    return this._queries;
  }
  /**
   * Property to simply extract all text on the page
   *
   * This is calculated by concatenating the text of all the page's LINE Blocks.
   */
  get text(): string {
    return this._lines.map((l) => l.text).join("\n");
  }

  /**
   * Return a best-effort semantic HTML representation of the page and its content
   *
   * This is useful for ingesting the document into tools like search engines or Generative Large
   * Language Models (LLMs) that might be capable of understanding semantic structure such as
   * paragraphs or headings, but cannot consume fully multi-modal (image/text coordinate) data.
   *
   * If the Textract LAYOUT feature was enabled, this function uses its results to assemble and
   * sequence paragraphs, headings, and other features.
   *
   * TODO: Support more basic .html() on Textract results for which LAYOUT analysis was not enabled
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   *
   * @throws If Textract Layout analysis was not enabled in the API request.
   */
  html(): string {
    if (this.hasLayout) {
      // Since the Textract LAYOUT feature was enabled, we can use it to render semantic HTML
      return this._layout.html();
    } else {
      // To render semantic HTML for non-Layout-analysed documents, we'd want to collect the
      // various components (plain text lines, fields, tables, etc) in approximate reading order
      // and intersperse them. It seems possible, but not straightforward - don't have a solution
      // yet.
      throw new Error("Page.html() is not yet implemented for results where Textract LAYOUT was not enabled");
    }
  }

  str(): string {
    return `Page\n==========\n${this._content.join("\n")}\n`;
  }
}

// content.ts concrete Page-dependent types:
/**
 * Parsed TRP object for a line of text on the page
 *
 * Wraps an Amazon Textract `LINE` Block in the underlying API response. You'll usually create
 * this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-lines-words.html
 */
export class Line extends LineGeneric<Page> {}

// form.ts concrete Page-dependent types:
/**
 * Parsed TRP object for a key-value field in form analysis data
 *
 * You'll usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
 */
export class Field extends FieldGeneric<Page> {}
/**
 * Parsed TRP object for the key/label of a key-value field pair in form analysis data
 *
 * Wraps an Amazon Textract `KEY_VALUE_SET` (or `KEY`) Block in the underlying API response. You'll
 * usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
 */
export class FieldKey extends FieldKeyGeneric<Page> {}
/**
 * Parsed TRP object for the value/data of a key-value field pair in form analysis data
 *
 * Wraps an Amazon Textract `KEY_VALUE_SET` (or `VALUE`) Block in the underlying API response.
 * You'll usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
 */
export class FieldValue extends FieldValueGeneric<Page> {}
/**
 * Parsed TRP object wrapping all the key-value form data for one page of a document
 *
 * You'll usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
 */
export class Form extends FormGeneric<Page> {}

// layout.ts concrete Page-dependent types:
/**
 * Parsed TRP object for a diagram / image / figure on a page, detected by document layout analysis
 *
 * Wraps an Amazon Textract `LAYOUT_FIGURE` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutFigure extends LayoutFigureGeneric<Page> {}
/**
 * Parsed TRP object for an element of page footer content, detected by document layout analysis
 *
 * Note this excludes page numbers (see `LayoutPageNumber`). Wraps an Amazon Textract
 * `LAYOUT_FOOTER` Block in the underlying API response. You'll usually create this via a
 * `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutFooter extends LayoutFooterGeneric<Page> {}
/**
 * Parsed TRP object for an element of page header content, detected by document layout analysis
 *
 * Note this excludes page numbers (see `LayoutPageNumber`). Wraps an Amazon Textract
 * `LAYOUT_HEADER` Block in the underlying API response. You'll usually create this via a
 * `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutHeader extends LayoutHeaderGeneric<Page> {}
/**
 * Parsed TRP object for an area of key-value (form data) content, detected by layout analysis
 *
 * Note this typically includes multiple `Field` objects (if you have forms data analysis enabled).
 * Wraps an Amazon Textract `LAYOUT_KEY_VALUE` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutKeyValue extends LayoutKeyValueGeneric<Page> {}
/**
 * Parsed TRP object for a page number annotation, detected by document layout analysis
 *
 * Wraps an Amazon Textract `LAYOUT_PAGE_NUMBER` Block in the underlying API response. You'll
 * usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutPageNumber extends LayoutPageNumberGeneric<Page> {}
/**
 * Parsed TRP object for a section heading / title, detected by document layout analysis
 *
 * Wraps an Amazon Textract `LAYOUT_SECTION_HEADER` Block in the underlying API response. You'll
 * usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutSectionHeader extends LayoutSectionHeaderGeneric<Page> {}
/**
 * Parsed TRP object for a table, detected by document layout analysis
 *
 * Note this can link through to, but may not correspond 1:1 with, structured table data extracted
 * by the Tables analysis. Wraps an Amazon Textract `LAYOUT_TABLE` Block in the underlying API
 * response. You'll usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutTable extends LayoutTableGeneric<Page> {}
/**
 * Parsed TRP object for a paragraph / independent element of text, detected by layout analysis
 *
 * Wraps an Amazon Textract `LAYOUT_TEXT` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutText extends LayoutTextGeneric<Page> {}
/**
 * Parsed TRP object for an overall document title, detected by document layout analysis
 *
 * Wraps an Amazon Textract `LAYOUT_TITLE` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutTitle extends LayoutTitleGeneric<Page> {}
/**
 * Parsed TRP object for a bulleted or numbered list, detected by document layout analysis
 *
 * Wraps an Amazon Textract `LAYOUT_LIST` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class LayoutList extends LayoutListGeneric<Page> {}
/**
 * Parsed TRP object for the overall layout of a page, detected by document layout analysis
 *
 * Can be used to iterate through content like headings, paragraphs, headers and footers, in
 * implied reading order (even for multi-column documents). You'll usually create this via a
 * `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */
export class Layout extends LayoutGeneric<Page> {}

// query.ts concrete Page-dependent types:
/**
 * Parsed TRP object for one page's instance of a submitted Amazon Textract Query
 *
 * Wraps an Amazon Textract `QUERY` Block in the underlying API response. You'll usually create
 * this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */
export class QueryInstance extends QueryInstanceGeneric<Page> {}
/**
 * Parsed TRP object wrapping all the Textract Queries results for one page in a document
 *
 * You'll usually create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */
export class QueryInstanceCollection extends QueryInstanceCollectionGeneric<Page> {}
/**
 * Parsed TRP object for one detected result for a submitted Amazon Textract Query
 *
 * Wraps an Amazon Textract `QUERY_RESULT` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html
 */
export class QueryResult extends QueryResultGeneric<Page> {}

// table.ts concrete Page-dependent types:
/**
 * Parsed TRP object for a (sub-)cell of a table, before considering any merged cells
 *
 * Wraps an Amazon Textract `CELL` Block in the underlying API response. You'll usually create this
 * via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
 */
export class Cell extends CellGeneric<Page> {}
/**
 * Parsed TRP object for a merged cell in a table
 *
 * Wraps an Amazon Textract `MERGED_CELL` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
 */
export class MergedCell extends MergedCellGeneric<Page> {}
/**
 * Parsed TRP object for one row in a table
 *
 * `Row`s don't directly wrap any one object in Amazon Textract API results, but are a collection
 * used to help iterate through table contents. You'll usually create this via a
 * `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
 */
export class Row extends RowGeneric<Page> {}
/**
 * Parsed TRP object for a table on a page, detected by document tables analysis
 *
 * Wraps an Amazon Textract `TABLE` Block in the underlying API response. You'll usually create
 * this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
 */
export class Table extends TableGeneric<Page> {}
/**
 * Parsed TRP object for a trailing/footer caption of a table
 *
 * Wraps an Amazon Textract `TABLE_FOOTER` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
 */
export class TableFooter extends TableFooterGeneric<Page> {}
/**
 * Parsed TRP object for a leading/header caption of a table
 *
 * Wraps an Amazon Textract `TABLE_TITLE` Block in the underlying API response. You'll usually
 * create this via a `TextractDocument`, rather than directly.
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
 */
export class TableTitle extends TableTitleGeneric<Page> {}

/**
 * Main TRP class to parse and analyze Amazon Textract document analysis & text detection results
 */
export class TextractDocument
  extends ApiObjectWrapper<ApiResponsePage & ApiResponseWithContent>
  implements IDocBlocks, IRenderable
{
  _blockMap: { [blockId: string]: ApiBlock };
  _form: FormsCompositeGeneric<Page, TextractDocument>;
  _pages: Page[];

  /**
   * Create (parse) a TextractDocument from Amazon Textract API response JSON(s)
   *
   * @param textractResults A (parsed) Textract response JSON, or an array of multiple from the same job
   */
  constructor(textractResults: ApiResponsePage | ApiResponsePages) {
    let dict;
    if (Array.isArray(textractResults)) {
      dict = TextractDocument._consolidateMultipleResponses(textractResults);
    } else {
      if (!("Blocks" in textractResults && textractResults.Blocks?.length)) {
        throw new Error(`Provided Textract JSON has no content! (.Blocks array)`);
      }
      dict = textractResults;
    }
    super(dict);

    if ("NextToken" in this._dict && this._dict.NextToken) {
      console.warn(`Provided Textract JSON contains a NextToken: Content may be truncated!`);
    }

    this._blockMap = {};
    this._pages = [];
    this._form = new FormsCompositeGeneric([], this);
    this._parse();
  }

  _parse(): void {
    this._blockMap = this._dict.Blocks.reduce(
      (acc, next) => {
        acc[next.Id] = next;
        return acc;
      },
      {} as { [blockId: string]: ApiBlock },
    );

    let currentPageBlock: ApiPageBlock | null = null;
    let currentPageContent: ApiBlock[] = [];
    this._pages = [];
    this._dict.Blocks.forEach((block) => {
      if (block.BlockType == ApiBlockType.Page) {
        if (currentPageBlock) {
          this._pages.push(new Page(currentPageBlock, currentPageContent, this));
        }
        currentPageBlock = block;
        currentPageContent = [block];
      } else {
        currentPageContent.push(block);
      }
    });
    if (currentPageBlock) {
      this._pages.push(new Page(currentPageBlock, currentPageContent, this));
    }

    this._form = new FormsCompositeGeneric(
      this._pages.map((p) => p.form),
      this,
    );
  }

  static _consolidateMultipleResponses(
    textractResultArray: ApiResponsePages,
  ): ApiResponsePage & ApiResponseWithContent {
    if (!textractResultArray?.length) throw new Error(`Input Textract Results list empty!`);
    let nPages = 0;
    const docMetadata: ApiDocumentMetadata = { Pages: 0 };
    let blocks: ApiBlock[] = [];
    let modelVersion = "";
    let analysisType: null | "AnalyzeDocument" | "DetectText" = null;
    let jobStatus: null | "IN_PROGRESS" | "SUCCEEDED" | "PARTIAL_SUCCESS" = null;
    let jobStatusMessage: null | string = null;
    let warnings: null | ApiResultWarning[] = null;
    for (const textractResult of textractResultArray) {
      if ("Blocks" in textractResult && textractResult.Blocks) {
        blocks = blocks.concat(textractResult.Blocks);
      } else {
        console.warn("Found Textract response with no content");
      }
      if ("DocumentMetadata" in textractResult) {
        Object.assign(docMetadata, textractResult["DocumentMetadata"]);
        nPages = Math.max(nPages, textractResult.DocumentMetadata.Pages);
      }
      if ("AnalyzeDocumentModelVersion" in textractResult) {
        if (analysisType && analysisType !== "AnalyzeDocument") {
          throw new Error("Inconsistent textractResults contain both AnalyzeDocument and DetectText results");
        }
        analysisType = "AnalyzeDocument";
        if (modelVersion && modelVersion !== textractResult.AnalyzeDocumentModelVersion) {
          console.warn(
            `Inconsistent Textract model versions ${modelVersion} and ${textractResult.AnalyzeDocumentModelVersion}: Ignoring latter`,
          );
        } else {
          modelVersion = textractResult.AnalyzeDocumentModelVersion;
        }
      }
      if ("DetectDocumentTextModelVersion" in textractResult) {
        if (analysisType && analysisType !== "DetectText") {
          throw new Error("Inconsistent textractResults contain both AnalyzeDocument and DetectText results");
        }
        analysisType = "DetectText";
        if (modelVersion && modelVersion !== textractResult.DetectDocumentTextModelVersion) {
          console.warn(
            `Inconsistent Textract model versions ${modelVersion} and ${textractResult.DetectDocumentTextModelVersion}: Ignoring latter`,
          );
        } else {
          modelVersion = textractResult.DetectDocumentTextModelVersion;
        }
      }
      if ("JobStatus" in textractResult) {
        if (
          textractResult.JobStatus == "FAILED" ||
          (textractResult.JobStatus || "").toLocaleUpperCase().indexOf("FAIL") >= 0
        ) {
          throw new Error(`Textract results contain failed job of status ${textractResult.JobStatus}`);
        } else if (jobStatus && jobStatus !== textractResult.JobStatus) {
          throw new Error(
            `Textract results inconsistent JobStatus values ${jobStatus}, ${textractResult.JobStatus}`,
          );
        }
        jobStatus = textractResult.JobStatus;
      }
      if ("StatusMessage" in textractResult && textractResult.StatusMessage) {
        if (jobStatusMessage && textractResult.StatusMessage !== jobStatusMessage) {
          console.warn(`Multiple StatusMessages in Textract results - keeping longest`);
          if (textractResult.StatusMessage.length > jobStatusMessage.length) {
            jobStatusMessage = textractResult.StatusMessage;
          }
        } else {
          jobStatusMessage = textractResult.StatusMessage;
        }
      }
      if ("Warnings" in textractResult && textractResult.Warnings) {
        warnings = warnings ? warnings.concat(textractResult.Warnings) : textractResult.Warnings;
      }
    }

    const content: ApiResponseWithContent = {
      DocumentMetadata: docMetadata,
      Blocks: blocks,
    };
    const modelVersionFields =
      analysisType == "AnalyzeDocument"
        ? { AnalyzeDocumentModelVersion: modelVersion }
        : analysisType == "DetectText"
          ? { DetectDocumentTextModelVersion: modelVersion }
          : { AnalyzeDocumentModelVersion: modelVersion || "Unknown" };
    const jobStatusFields = jobStatus ? { JobStatus: jobStatus } : {};
    const statusMessageFields = jobStatusMessage ? { StatusMessage: jobStatusMessage } : {};
    const warningFields = warnings ? { ArfBarf: warnings } : {};

    const lastItem = textractResultArray[textractResultArray.length - 1];
    const nextTokenFields = "NextToken" in lastItem ? { NextToken: lastItem.NextToken } : {};

    return {
      ...content,
      ...modelVersionFields,
      ...jobStatusFields,
      ...statusMessageFields,
      ...warningFields,
      ...nextTokenFields,
    };
  }

  /**
   * The Textract Forms analysis result container for all K-Vs across the document
   *
   * This object is still created (but will be empty) if the Textract FORMS analysis was disabled
   *
   * For details see: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
   */
  get form(): FormsComposite {
    return this._form;
  }

  /**
   * The number of pages present in the document
   */
  get nPages(): number {
    return this._pages.length;
  }

  /**
   * Property to simply extract the document content as flat text
   *
   * Page contents are separated by 4 newlines
   */
  get text(): string {
    return this._pages.map((page) => page.text).join("\n\n\n\n");
  }

  getBlockById(blockId: string): ApiBlock | undefined {
    return this._blockMap && this._blockMap[blockId];
  }

  /**
   * Return a parsed TRP.js object corresponding to an API Block
   *
   * At the document level, this works by querying each `Page` in turn
   *
   * @param blockId Unique ID of the API Block for which a parsed object should be fetched
   * @param allowBlockTypes Optional restriction on acceptable ApiBlockType(s) to return
   * @throws If no parsed object exists for the block ID, or it doesn't match `allowBlockTypes`
   */
  getItemByBlockId(
    blockId: string,
    allowBlockTypes?: ApiBlockType | ApiBlockType[] | null,
  ): IApiBlockWrapper<ApiBlock> {
    for (const page of this._pages) {
      try {
        return page.getItemByBlockId(blockId, allowBlockTypes);
      } catch {
        // Throws when no block present - so ignore this and try next page
      }
    }
    throw new Error(`No parser item found on any page, for block ID ${blockId}`);
  }

  /**
   * Iterate through the pages of the document
   * @example
   * for (const page of doc.iterPages()) {
   *   console.log(page.str());
   * }
   * @example
   * const pages = [...doc.iterPages()];
   */
  iterPages(): Iterable<Page> {
    return getIterable(() => this._pages);
  }

  /**
   * Fetch a snapshot of the list of all API `Block` items owned by this PAGE
   *
   * @returns (A shallow copy of) the list of raw `Block` objects
   */
  listBlocks(): ApiBlock[] {
    return this._dict.Blocks.slice();
  }

  /**
   * Fetch a snapshot of the list of parsed `Page`s in this document object
   *
   * @returns (A shallow copy of) the list of parsed `Page` objects
   */
  listPages(): Page[] {
    return this._pages.slice();
  }

  /**
   * Fetch a parsed `Page` of the document by 1-based page number
   * @param pageNum 1-based index of the target page to fetch
   * @throws If `pageNum` is less than 1, or greater than or equal to `doc.nPages``
   */
  pageNumber(pageNum: number): Page {
    if (!(pageNum >= 1 && pageNum <= this._pages.length)) {
      throw new Error(`pageNum ${pageNum} must be between 1 and ${this._pages.length}`);
    }
    return this._pages[pageNum - 1];
  }

  /**
   * Return a best-effort semantic HTML representation of the document
   *
   * This is useful for ingesting the document into tools like search engines or Generative Large
   * Language Models (LLMs) that might be capable of understanding semantic structure such as
   * paragraphs or headings, but cannot consume fully multi-modal (image/text coordinate) data.
   *
   * As per `Page.html()`, this currently depends on the Textract LAYOUT feature being enabled in
   * the underlying API request.
   *
   * TODO: Support more basic .html() on Textract results for which LAYOUT analysis was not enabled
   *
   * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
   *
   * @throws If Textract Layout analysis was not enabled in the API request.
   */
  html(): string {
    const bodyHtml = [
      "<body>",
      indent(this._pages.map((page) => `<div class="page">\n${indent(page.html())}\n</div>`).join("\n")),
      "</body>",
    ].join("\n");

    return `<!DOCTYPE html>\n<html>\n${bodyHtml}\n</html>`;
  }

  str(): string {
    return `\nDocument\n==========\n${this._pages.map((p) => p.str()).join("\n\n")}\n\n`;
  }
}

export class FormsComposite extends FormsCompositeGeneric<Page, TextractDocument> {}
