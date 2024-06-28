/**
 * TRP classes for (generic document) layout analysis objects
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html
 */

// Local Dependencies:
import { ApiBlockType, ApiRelationshipType, LAYOUT_BLOCK_TYPES } from "./api-models/base";
import { ApiBlock } from "./api-models/document";
import {
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
} from "./api-models/layout";
import {
  _implIterRelatedBlocksByRelType,
  ApiObjectWrapper,
  doesFilterAllowBlockType,
  escapeHtml,
  getIterable,
  IApiBlockWrapper,
  IBlockManager,
  IBlockTypeFilterOpts,
  indent,
  INestedListOpts,
  IRenderable,
  IRenderOpts,
  IWithParentPage,
  IWithRelatedItems,
  normalizeOptionalSet,
  PageHostedApiBlockWrapper,
  setIntersection,
} from "./base";
import { buildWithContent, IWithContent, LineGeneric } from "./content";
import { FieldGeneric, IWithForm } from "./form";
import { Geometry, IWithGeometry } from "./geometry";
import { IWithTables, TableGeneric } from "./table";

/**
 * Standard interface for parsed Layout items
 */
export interface ILayoutItem<
  TBlock extends ApiLayoutBlock,
  TContent extends IApiBlockWrapper<ApiBlock> & IRenderable,
  TPage extends IApiBlockWrapper<ApiBlock> &
    IBlockManager &
    IWithForm<IBlockManager> &
    IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
    IWithTables<IBlockManager>,
  TGeometryHost extends ApiObjectWrapper<TBlock>,
> extends IApiBlockWrapper<TBlock>,
    IRenderable,
    IWithContent<TContent>,
    IWithParentPage<TPage>,
    IWithGeometry<TBlock, TGeometryHost> {
  /**
   * 0-100 based confidence of the layout model for this element (*separate* from OCR confidence!)
   */
  confidence: number;
  /**
   * Position of this layout element on the input image/page
   */
  geometry: Geometry<TBlock, TGeometryHost>;
  /**
   * Number of layout items (any layout blocks) linked as direct children of this item
   *
   * Note this does *not* include any nested children. At the time of writing, only
   * LAYOUT_LIST items link to LAYOUT_TEXT children - so no nesting should be present anyway.
   */
  get nLayoutChildrenDirect(): number;
  /**
   * *Total* number of layout items (any layout blocks) linked as direct or indirect children
   *
   * This includes any nested children. At the time of writing, only LAYOUT_LIST items link to
   * LAYOUT_TEXT children - so no nesting should be present anyway.
   */
  get nLayoutChildrenTotal(): number;
  /**
   * Number of text `Line`s in this object
   */
  get nTextLines(): number;
  /**
   * Parsed page layout collection that this element belongs to
   */
  parentLayout: LayoutGeneric<TPage>;
  // Because they're all content containers, Layout* items support the full IBlockTypeFilterOpts
  // rather than just IRenderOpts
  html(opts?: IBlockTypeFilterOpts): string;
  /**
   * Layout items (any layout block types) linked as children to this item
   *
   * Supports recursing via `opts.deep`, but at the time of writing only LAYOUT_LIST items link to
   * LAYOUT_TEXT children - so no nesting should be present anyway.
   */
  iterLayoutChildren(
    opts: IBlockTypeFilterOpts & INestedListOpts,
  ): Iterable<
    ILayoutItem<
      ApiLayoutBlock,
      IApiBlockWrapper<ApiBlock> & IRenderable,
      TPage,
      ApiObjectWrapper<ApiLayoutBlock>
    >
  >;
  /**
   * Iterate through the text `Line`s in this object
   * @example
   * for (const line of layItem.iterTextLines()) {
   *   console.log(line.text);
   * }
   * @example
   * [...layItem.iterTextLines()].forEach(
   *   (line) => console.log(line.text)
   * );
   */
  iterTextLines(): Iterable<LineGeneric<TPage>>;
  /**
   * Layout items (any layout block types) linked as children to this item
   *
   * Supports recursing via `opts.deep`, but at the time of writing only LAYOUT_LIST items link to
   * LAYOUT_TEXT children - so no nesting should be present anyway.
   */
  listLayoutChildren(
    opts?: IBlockTypeFilterOpts & INestedListOpts,
  ): Array<
    ILayoutItem<
      ApiLayoutBlock,
      IApiBlockWrapper<ApiBlock> & IRenderable,
      TPage,
      ApiObjectWrapper<ApiLayoutBlock>
    >
  >;
  /**
   * List the text `Line` items in this object
   */
  listTextLines(): Array<LineGeneric<TPage>>;
}

/**
 * Generic class on which layout items are based
 */
class LayoutItemBaseGeneric<
    TBlock extends ApiLayoutBlock,
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends PageHostedApiBlockWrapper<TBlock, TPage>
  implements IWithGeometry<TBlock, LayoutItemBaseGeneric<TBlock, TPage>>, IWithParentPage<TPage>
{
  _geometry: Geometry<ApiLayoutBlock, LayoutItemBaseGeneric<TBlock, TPage>>;
  _parentLayout: LayoutGeneric<TPage>;

  constructor(block: TBlock, parentLayout: LayoutGeneric<TPage>) {
    super(block, parentLayout.parentPage);
    this._geometry = new Geometry(block.Geometry, this);
    this._parentLayout = parentLayout;
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  get geometry(): Geometry<ApiLayoutBlock, LayoutItemBaseGeneric<TBlock, TPage>> {
    return this._geometry;
  }
  get nLayoutChildrenDirect(): number {
    return this.listLayoutChildren({ deep: false }).length;
  }
  get nLayoutChildrenTotal(): number {
    return this.listLayoutChildren({ deep: true }).length;
  }
  get parentLayout(): LayoutGeneric<TPage> {
    return this._parentLayout;
  }
  iterLayoutChildren(
    opts: IBlockTypeFilterOpts & INestedListOpts = {},
  ): Iterable<
    ILayoutItem<
      ApiLayoutBlock,
      IApiBlockWrapper<ApiBlock> & IRenderable,
      TPage,
      ApiObjectWrapper<ApiLayoutBlock>
    >
  > {
    return getIterable(() => this.listLayoutChildren(opts));
  }
  listLayoutChildren({
    deep = false,
    includeBlockTypes = null,
    onUnexpectedBlockType = null,
    skipBlockTypes = null,
  }: IBlockTypeFilterOpts & INestedListOpts = {}): Array<
    ILayoutItem<
      ApiLayoutBlock,
      IApiBlockWrapper<ApiBlock> & IRenderable,
      TPage,
      ApiObjectWrapper<ApiLayoutBlock>
    >
  > {
    let result: Array<
      ILayoutItem<
        ApiLayoutBlock,
        IApiBlockWrapper<ApiBlock> & IRenderable,
        TPage,
        ApiObjectWrapper<ApiLayoutBlock>
      >
    > = [];
    if (includeBlockTypes) {
      includeBlockTypes = setIntersection(LAYOUT_BLOCK_TYPES, normalizeOptionalSet(includeBlockTypes));
    } else {
      includeBlockTypes = LAYOUT_BLOCK_TYPES;
    }
    for (const childRaw of this.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes,
      onUnexpectedBlockType,
      skipBlockTypes,
    })) {
      const child = childRaw as ILayoutItem<
        ApiLayoutBlock,
        IApiBlockWrapper<ApiBlock> & IRenderable,
        TPage,
        ApiObjectWrapper<ApiLayoutBlock>
      >;
      result.push(child);
      if (deep)
        result = result.concat(
          child.listLayoutChildren({
            deep,
            includeBlockTypes,
            onUnexpectedBlockType,
            skipBlockTypes,
          }),
        );
    }
    return result;
  }
}

/**
 * Common base class for Layout items whose `Child`ren are always text LINEs
 *
 * Not a big fan of relying heavily on this level of hierarchy because of its fragility... But at
 * the moment it seems like almost every Layout item contains only text `LINE` blocks, and it'd be
 * better to represent the `.text` of these as newline-joined rather than the default space-joined
 * from the mixin... So for now this helps us reduce some code duplication.
 */
class LayoutLineContainerItem<
  TBlock extends ApiLayoutBlock,
  TPage extends IApiBlockWrapper<ApiBlock> &
    IBlockManager &
    IWithForm<IBlockManager> &
    IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
    IWithTables<IBlockManager>,
> extends buildWithContent<LineGeneric<IBlockManager>>({ contentTypes: [ApiBlockType.Line] })(
  LayoutItemBaseGeneric,
)<TBlock, TPage> {
  override getText(opts?: IBlockTypeFilterOpts) {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    return this.listContent(opts)
      .map((c) => c.text)
      .join("\n");
  }

  /**
   * Iterate through the text `Line`s in this object
   *
   * (Should be equivalent to iterContent, for LayoutLineContainer items that only contain text
   * LINE objects)
   *
   * @example
   * for (const line of layItem.iterTextLines()) {
   *   console.log(line.text);
   * }
   * @example
   * [...layItem.iterTextLines()].forEach(
   *   (line) => console.log(line.text)
   * );
   */
  iterTextLines(): Iterable<LineGeneric<TPage>> {
    // For this base, the 'content' is typed as text Lines only anyway:
    return getIterable(() => this.listTextLines());
  }
  /**
   * List the text `Line` items in this object
   *
   * (Should be equivalent to listContent, for LayoutLineContainer items that only contain text
   * LINE objects)
   */
  listTextLines(): Array<LineGeneric<TPage>> {
    // For this base, the 'content' is typed as text Lines only anyway:
    return this.listContent() as LineGeneric<TPage>[];
  }

  /**
   * Number of text `Line`s in this object
   *
   * (Should be equivalent to nContentItems, for LayoutLineContainer items that only contain text
   * LINE objects)
   */
  get nTextLines(): number {
    return this.listTextLines().length;
  }
}

/**
 * Generic base class for a layout entity describing a diagram, figure, or image
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutFigure`.
 */
export class LayoutFigureGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutFigureBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutFigureBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutFigureBlock, TPage>
    >
{
  /**
   * The semantic HTML representation for a figure is a <div> of class `figure`
   *
   * Detected text within the figure (if any), is included inside the div
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const rawText = this.getText(opts);
    const content = rawText ? `\n${indent(escapeHtml(rawText))}\n` : "";
    return `<div class="figure">${content}</div>`;
  }

  /**
   * The str() representation of a figure allows including text, but usually doesn't have any
   */
  str(): string {
    return `#### Figure ####\n${this.text}${this.text ? "\n" : ""}################`;
  }
}

/**
 * Generic base class for a layout entity describing a page footer element
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutFooter`.
 */
export class LayoutFooterGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutFooterBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutFooterBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutFooterBlock, TPage>
    >
{
  /**
   * The semantic HTML representation for a Footer element is a <div> of class `footer-el`
   *
   * Note that there might be multiple footer elements on a page (e.g. horizontal columns)
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const rawText = this.getText(opts);
    const content = rawText ? `\n${indent(escapeHtml(rawText))}\n` : "";
    return `<div class="footer-el">${content}</div>`;
  }

  str(): string {
    return `---- Footer text ----\n${this.text}\n---------------------`;
  }
}

/**
 * Generic base class for a layout entity describing a page header element
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutHeader`.
 */
export class LayoutHeaderGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutHeaderBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutHeaderBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutHeaderBlock, TPage>
    >
{
  /**
   * The semantic HTML representation for a Footer element is a <div> of class `footer-el`
   *
   * Note that there might be multiple footer elements on a page (e.g. horizontal columns)
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const rawText = this.getText(opts);
    const content = rawText ? `\n${indent(escapeHtml(rawText))}\n` : "";
    return `<div class="header-el">${content}</div>`;
  }

  str(): string {
    return `---- Header text ----\n${this.text}\n---------------------`;
  }
}

/**
 * Generic base class for a layout entity describing a key-value (form data) pair
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutKeyValue`.
 */
export class LayoutKeyValueGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutKeyValueBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutKeyValueBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutKeyValueBlock, TPage>
    >
{
  /**
   * Utility function to list all content (word, signature, etc) block IDs within a K-V Form Field
   *
   * Used to support mapping between Layout and K-V Forms objects e.g. in
   * `_mapPageContentToFormFields()`
   *
   * @param field Parsed TRP.js `Field` object from forms analysis
   * @returns Snapshot list of all the content (word, etc) block IDs in the Field's Key and Value
   */
  protected _listContentIdsInFormField<TPage extends IBlockManager>(field: FieldGeneric<TPage>): string[] {
    const keyContentIds = field.key.listWords().map((word) => word.id);
    const fieldVal = field.value;
    return fieldVal ? keyContentIds.concat(fieldVal.listContent().map((item) => item.id)) : keyContentIds;
  }

  /**
   * Utility function to generate a (point-in-time) mapping from field K/V content to field objects
   *
   * Since Textract JSON only stores one-way mappings from Key->WORD, Key->Value, and
   * Value->(WORD/SELECTION_ELEMENT/SIGNATURE), and from LAYOUT_KEY_VALUE->LINE->WORD, we need to
   * calculate some inverse mappings to enable searches to link from Layout to form Fields.
   *
   * TODO: If this has utility elsewhere, move it to FormGeneric and consider caching?
   */
  protected _mapPageContentToFormFields(): { [blockId: string]: FieldGeneric<TPage> } {
    const contentToFields: { [blockId: string]: FieldGeneric<TPage> } = {};
    // A little type cast to extend from formally-provable IBlockManager to practical TPage:
    (this.parentPage.form.listFields() as FieldGeneric<TPage>[]).forEach((field) => {
      this._listContentIdsInFormField(field).forEach((id) => {
        contentToFields[id] = field;
      });
    });
    return contentToFields;
  }

  /**
   * Iterate through the Form Fields spanned by this LayoutKeyValue item
   *
   * Note this is a non-trivial lookup that requires searching through associated WORD blocks, due
   * to the structure of Textract responses. If Textract FORMS analysis was not also enabled in the
   * API, this will return an empty list [].
   *
   * @example
   * for (const field of form.iterFields()) {
   *   console.log(field?.key.text);
   * }
   * @example
   * const fields = [...form.iterFields()];
   */
  iterFields(): Iterable<FieldGeneric<TPage>> {
    return getIterable(() => this.listFields());
  }

  /**
   * List the Form Fields spanned by this LayoutKeyValue item
   *
   * Note this is a non-trivial lookup that requires searching through associated WORD blocks, due
   * to the structure of Textract responses. If Textract FORMS analysis was not also enabled in the
   * API, this will return an empty list [].
   */
  listFields(): FieldGeneric<TPage>[] {
    const wordsToFields = this._mapPageContentToFormFields();
    const consumedIds: { [id: string]: true } = {};
    const result: FieldGeneric<TPage>[] = [];
    for (const line of this.iterContent()) {
      for (const word of line.iterWords()) {
        if (word.id in consumedIds) continue;
        const field = wordsToFields[word.id];
        if (field) {
          result.push(field);
          this._listContentIdsInFormField(field).forEach((id) => {
            consumedIds[id] = true;
          });
        }
      }
    }
    return result;
  }

  /**
   * The semantic HTML representation for a key-value element is a <div> of class "key-value"
   *
   * Note this attempts to reconcile the contained content to Forms analysis' Key-Value pairs for
   * optimally semantic HTML, *if* the Forms feature was also enabled - but this is a non-trivial
   * operation.
   *
   * Since there's no guaranteed 1:1 correspondence between Layout K-V regions and detected form
   * fields, we loop through the plain text (from layout) but insert the semantic HTML for a whole
   * K-V Form Field at the first overlapping mention.
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const wordsToFields = this._mapPageContentToFormFields();
    const consumedIds: { [id: string]: true } = {};
    const lineReprs: string[] = [];
    for (const line of this.iterContent(opts)) {
      const wordReprs: string[] = [];
      for (const word of line.iterWords(opts)) {
        const wordId = word.id;
        if (wordId in consumedIds) continue;
        if (wordId in wordsToFields) {
          const field = wordsToFields[wordId];
          wordReprs.push(field.html(opts));
          this._listContentIdsInFormField(field).forEach((id) => {
            consumedIds[id] = true;
          });
        } else {
          wordReprs.push(word.html(opts));
        }
      }
      lineReprs.push(wordReprs.join(" "));
    }
    const lineReprTexts = lineReprs.filter((rep) => rep).join("\n");
    const content = lineReprTexts ? `\n${indent(lineReprTexts)}\n` : "";
    return `<div class="key-value">${content}</div>`;
  }

  /**
   * The human-readable `str()` representation for this element does not do KV Forms reconciliation
   *
   * It just returns the Layout object's `text` with some bookends for clarity.
   */
  str(): string {
    return `---- Key-value ----\n${this.text}\n-------------------`;
  }
}

/**
 * Generic base class for a layout entity describing a page number annotation
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutPageNumber`.
 */
export class LayoutPageNumberGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutPageNumberBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutPageNumberBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutPageNumberBlock, TPage>
    >
{
  /**
   * The semantic HTML representation for a page number element is a <div> of class "page-num"
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const rawText = this.getText(opts);
    const content = rawText ? `\n${indent(escapeHtml(rawText))}\n` : "";
    return `<div class="page-num">${content}</div>`;
  }

  str(): string {
    return `---- Page number: ${this.text}`;
  }
}

/**
 * Generic base class for a layout entity describing a section heading / title
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutSectionHeader`.
 */
export class LayoutSectionHeaderGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutSectionHeaderBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutSectionHeaderBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutSectionHeaderBlock, TPage>
    >
{
  /**
   * The semantic HTML representation for a section heading is a <h2> tag
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const rawText = this.getText(opts);
    const content = rawText ? `\n${indent(escapeHtml(rawText))}\n` : "";
    return `<h2>${content}</h2>`;
  }

  str(): string {
    return `\n${this.text}\n${"-".repeat(this.text.length)}\n`;
  }
}

/**
 * Generic base class for a layout entity describing a table
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutTable`.
 */
export class LayoutTableGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutTableBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutTableBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutTableBlock, TPage>
    >
{
  /**
   * Utility function to list all content (word, signature, etc) block IDs within a parsed Table object
   *
   * Used to support mapping between Layout and Tables analysis objects e.g. in
   * `_mapPageContentToTables()`
   *
   * @param field Parsed TRP.js `Field` object from forms analysis
   * @returns Snapshot list of all the content (word, etc) block IDs in the Field's Key and Value
   */
  protected _listContentIdsInTable<TPage extends IBlockManager>(table: TableGeneric<TPage>): string[] {
    // Need to consider header and footer sections as well as actual cells
    const cellContentIds = table
      .listRows()
      .map((row) =>
        row
          .listCells()
          .map((cell) =>
            cell
              .listContent()
              .map((item) => item.id)
              .flat(),
          )
          .flat(),
      )
      .flat();
    const footerIds = table
      .listFooters()
      .map((foot) =>
        foot
          .listWords()
          .map((word) => word.id)
          .flat(),
      )
      .flat();
    const titleIds = table
      .listTitles()
      .map((title) =>
        title
          .listWords()
          .map((word) => word.id)
          .flat(),
      )
      .flat();
    return titleIds.concat(cellContentIds, footerIds);
  }

  /**
   * Utility function to generate a (point-in-time) mapping from table content to Table objects
   *
   * Since Textract JSON only stores one-way mappings from CELL/MERGED_CELL->WORD, TABLE->CELL etc,
   * we need to calculate some inverse mappings to enable searches to link from Layout to table
   * objects.
   *
   * TODO: If this has utility elsewhere, move it to TableGeneric and consider caching?
   */
  protected _mapPageContentToTables(): { [blockId: string]: TableGeneric<TPage> } {
    const contentToTables: { [blockId: string]: TableGeneric<TPage> } = {};
    // A little type cast to extend from formally-provable IBlockManager to practical TPage:
    (this.parentPage.listTables() as TableGeneric<TPage>[]).forEach((table) => {
      this._listContentIdsInTable(table).forEach((id) => {
        contentToTables[id] = table;
      });
    });
    return contentToTables;
  }

  /**
   * Iterate through the Table objects spanned by this LayoutTable item (usually just 1)
   *
   * Note this is a non-trivial lookup that requires searching through associated WORD blocks, due
   * to the structure of Textract responses. If Textract TABLES analysis was not also enabled in
   * the API, this will return an empty list [].
   *
   * @example
   * for (const field of form.iterFields()) {
   *   console.log(field?.key.text);
   * }
   * @example
   * const fields = [...form.iterFields()];
   */
  iterTables(): Iterable<TableGeneric<TPage>> {
    return getIterable(() => this.listTables());
  }

  /**
   * List the Table objects spanned by this LayoutTable item (usually just 1)
   *
   * Note this is a non-trivial lookup that requires searching through associated WORD blocks, due
   * to the structure of Textract responses. If Textract TABLES analysis was not also enabled in
   * the API, this will return an empty list [].
   */
  listTables(): TableGeneric<TPage>[] {
    const wordsToTables = this._mapPageContentToTables();
    const consumedIds: { [id: string]: true } = {};
    const result: TableGeneric<TPage>[] = [];
    for (const line of this.iterContent()) {
      for (const word of line.iterWords()) {
        if (word.id in consumedIds) continue;
        const table = wordsToTables[word.id];
        if (table) {
          result.push(table);
          this._listContentIdsInTable(table).forEach((id) => {
            consumedIds[id] = true;
          });
        }
      }
    }
    return result;
  }

  /**
   * The outer semantic HTML representation for a key-value element is a <div class="table">
   *
   * IF Textract TABLES analysis was also run on the document, this will attempt to reconcile the
   * tagged Layout content to extracted `Table`(s) - but this is a non-trivial operation.
   *
   * Since there's no guaranteed 1:1 correspondence between the Layout Table regions and detected
   * Table objects, populate the div content by looping through the plain text (from layout) but
   * inserting the semantic HTML for each whole `<table>` at the first overlapping mention.
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const wordsToTables = this._mapPageContentToTables();
    const consumedIds: { [id: string]: true } = {};
    const lineReprs: string[] = [];
    for (const line of this.iterContent(opts)) {
      const wordReprs: string[] = [];
      for (const word of line.iterWords(opts)) {
        const wordId = word.id;
        if (wordId in consumedIds) continue;
        if (wordId in wordsToTables) {
          const table = wordsToTables[wordId];
          wordReprs.push(table.html(opts));
          this._listContentIdsInTable(table).forEach((id) => {
            consumedIds[id] = true;
          });
        } else {
          wordReprs.push(word.html(opts));
        }
      }
      lineReprs.push(wordReprs.join(" "));
    }
    const lineReprsText = lineReprs.filter((rep) => rep).join("\n");
    const content = lineReprsText ? `\n${indent(lineReprsText)}\n` : "";
    return `<div class="table">${content}</div>`;
  }

  /**
   * The human-readable `str()` representation for this element does not do Tables reconciliation
   *
   * It just returns the Layout object's `text` with some bookends for clarity.
   */
  str(): string {
    return ["|==== Table (structure unknown) ====|", this.text, "|==================================|"].join(
      "\n",
    );
  }
}

/**
 * Generic base class for a layout entity describing a paragraph of text
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutText`.
 */
export class LayoutTextGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutTextBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutTextBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutTextBlock, TPage>
    >
{
  /**
   * The semantic HTML representation for a text element is a <p> paragraph tag
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const rawText = this.getText(opts);
    const content = rawText ? `\n${indent(escapeHtml(rawText))}\n` : "";
    return `<p>${content}</p>`;
  }

  /**
   * The human-readable string representation for a text element is just the text itself.
   */
  str(): string {
    return this.text;
  }
}

/**
 * Generic base class for a layout entity describing a top-level document title
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutTitle`.
 */
export class LayoutTitleGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends LayoutLineContainerItem<ApiLayoutTitleBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutTitleBlock,
      LineGeneric<IBlockManager>,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutTitleBlock, TPage>
    >
{
  /**
   * The semantic HTML representation for a top-level title is a <h1> tag
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const rawText = this.getText(opts);
    const content = rawText ? `\n${indent(escapeHtml(rawText))}\n` : "";
    return `<h1>${content}</h1>`;
  }

  str(): string {
    return `\n\n${this.text}\n${"=".repeat(this.text.length)}\n`;
  }
}

/**
 * Generic base class for a layout entity describing a bulleted or numbered list
 *
 * If you're consuming this library, you probably just want to use `document.ts/LayoutList`.
 */
export class LayoutListGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  extends buildWithContent<
    LayoutTextGeneric<
      IApiBlockWrapper<ApiBlock> &
        IBlockManager &
        IWithForm<IBlockManager> &
        IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
        IWithTables<IBlockManager>
    >
  >({ contentTypes: [ApiBlockType.LayoutText] })(LayoutItemBaseGeneric)<ApiLayoutListBlock, TPage>
  implements
    ILayoutItem<
      ApiLayoutListBlock,
      LayoutTextGeneric<
        IApiBlockWrapper<ApiBlock> &
          IBlockManager &
          IWithForm<IBlockManager> &
          IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
          IWithTables<IBlockManager>
      >,
      TPage,
      LayoutItemBaseGeneric<ApiLayoutListBlock, TPage>
    >
{
  /**
   * Render the list as HTML
   *
   * TODO: Support ordered/numbered lists with <ol>, if we can infer when to use it?
   * TODO: innerHTML option on LayoutText to get rid of the <p> tags maybe?
   *
   * @param opts Optional configuration for filtering rendering to certain content types
   */
  html(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    const itemHtmls = this.listContent(opts)
      .map((item) => item.html(opts))
      .filter((s) => s)
      .map((s) => `<li>${s}</li>`);
    const content = itemHtmls.length ? `\n${indent(itemHtmls.join("\n"))}\n` : "";
    return `<ul>${content}</ul>`;
  }
  /**
   * Iterate through the text `Line`s in this object
   *
   * @example
   * for (const item of layList.iterTextLines()) {
   *   console.log(item.text);
   * }
   * @example
   * [...layList.iterTextLines()].forEach(
   *   (line) => console.log(line.text)
   * );
   */
  iterTextLines(): Iterable<LineGeneric<TPage>> {
    // For this base, the 'content' is typed as text Lines only anyway:
    return getIterable(() => this.listTextLines());
  }
  /**
   * List the text `Line` items in this object
   */
  listTextLines(): Array<LineGeneric<TPage>> {
    /**
     * Recursively listContent() to find items that are text LINEs or have nested content lines
     *
     * Flexible recursion should not actually be necessary because the hierarchy looks fixed
     * LAYOUT_LIST->LAYOUT_TEXT->LINE: But we do it this way to try and flexibly support updates.
     */
    function extractLinesRecursive(
      items: Array<
        IApiBlockWrapper<ApiBlock> & IRenderable & IWithContent<IApiBlockWrapper<ApiBlock> & IRenderable>
      >,
    ): LineGeneric<TPage>[] {
      return items
        .map((item) => {
          if (item.blockType === ApiBlockType.Line) return [item as unknown as LineGeneric<TPage>];
          else if (typeof item.listContent !== "undefined")
            return extractLinesRecursive(
              // Scary typing basically reduces to: "Whatever was in the function signature, but
              // the content it contains is also that type"
              (
                item as unknown as IApiBlockWrapper<ApiBlock> &
                  IRenderable &
                  IWithContent<
                    IApiBlockWrapper<ApiBlock> &
                      IRenderable &
                      IWithContent<IApiBlockWrapper<ApiBlock> & IRenderable>
                  >
              ).listContent(),
            );
          else return [];
        })
        .flat();
    }

    return extractLinesRecursive(this.listContent());
  }
  /**
   * The human-readable `str()` representation of a layout list is same as the (bulleted) `.text`
   */
  str(): string {
    return this.text;
  }

  /**
   * Number of text `Line`s in this object
   */
  get nTextLines(): number {
    return this.listTextLines().length;
  }
  /**
   * Text for LayoutList is rendered with '-' bullet points at 2/4-space indentation
   */
  override get text(): string {
    return this.listContent()
      .map((item) => `  - ${indent(item.text, { character: " ", count: 4, skipFirstLine: true })}`)
      .join("\n");
  }
}

/**
 * TypeScript type collecting all possible TRP parsed objects corresponding to layout elements
 */
export type LayoutItemGeneric<
  TPage extends IApiBlockWrapper<ApiBlock> &
    IBlockManager &
    IWithForm<IBlockManager> &
    IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
    IWithTables<IBlockManager>,
> =
  | LayoutFigureGeneric<TPage>
  | LayoutFooterGeneric<TPage>
  | LayoutHeaderGeneric<TPage>
  | LayoutKeyValueGeneric<TPage>
  | LayoutListGeneric<TPage>
  | LayoutPageNumberGeneric<TPage>
  | LayoutSectionHeaderGeneric<TPage>
  | LayoutTableGeneric<TPage>
  | LayoutTextGeneric<TPage>
  | LayoutTitleGeneric<TPage>;

/**
 * Generic base class for a page-level Layout analysis container
 *
 * If you're consuming this library, you probably just want to use `document.ts/Layout`.
 */
export class LayoutGeneric<
    TPage extends IApiBlockWrapper<ApiBlock> &
      IBlockManager &
      IWithForm<IBlockManager> &
      IWithRelatedItems<IApiBlockWrapper<ApiBlock>> &
      IWithTables<IBlockManager>,
  >
  implements IRenderable, IWithParentPage<TPage>
{
  _parentPage: TPage;

  constructor(parentPage: TPage) {
    this._parentPage = parentPage;

    for (const block of _implIterRelatedBlocksByRelType(
      ApiRelationshipType.Child,
      { includeBlockTypes: LAYOUT_BLOCK_TYPES, onMissingBlockId: "error" },
      parentPage,
      parentPage,
    )) {
      // The PageHostedBlockWrappers will automatically self-register with the manager (page):
      switch (block.BlockType) {
        case ApiBlockType.LayoutFigure:
          new LayoutFigureGeneric(block, this);
          break;
        case ApiBlockType.LayoutHeader:
          new LayoutHeaderGeneric(block, this);
          break;
        case ApiBlockType.LayoutFooter:
          new LayoutFooterGeneric(block, this);
          break;
        case ApiBlockType.LayoutKeyValue:
          new LayoutKeyValueGeneric(block, this);
          break;
        case ApiBlockType.LayoutList:
          new LayoutListGeneric(block, this);
          break;
        case ApiBlockType.LayoutPageNumber:
          new LayoutPageNumberGeneric(block, this);
          break;
        case ApiBlockType.LayoutSectionHeader:
          new LayoutSectionHeaderGeneric(block, this);
          break;
        case ApiBlockType.LayoutTable:
          new LayoutTableGeneric(block, this);
          break;
        case ApiBlockType.LayoutText:
          new LayoutTextGeneric(block, this);
          break;
        case ApiBlockType.LayoutTitle:
          new LayoutTitleGeneric(block, this);
          break;
      }
    }
  }

  /**
   * *Total* number of layout elements detected on the page, including nested items
   *
   * @deprecated Migrate to `.nItemsTotal` for clarity.
   */
  get nItems(): number {
    return this.nItemsTotal;
  }
  /**
   * Number of *top-level* layout elements detected on the page
   *
   * Some LAYOUT_* blocks may point to others as children, and this count will only include
   * top-level items.
   */
  get nItemsDirect(): number {
    return this.listItems({ deep: false }).length;
  }
  /**
   * *Total* number of layout elements detected on the page, including nested items
   *
   * Some LAYOUT_* blocks may point to others as children, and this count will include all layout
   * items on the page, not just those at the top level.
   */
  get nItemsTotal(): number {
    return this.listItems({ deep: true }).length;
  }
  /**
   * Parsed TRP.js page to which this Layout corresponds
   */
  get parentPage(): TPage {
    return this._parentPage;
  }
  /**
   * Collects the plain text content of all layout items, connected by \n\n
   */
  get text(): string {
    return this.listItems({ deep: false })
      .map((item) => item.text)
      .join("\n\n");
  }

  /**
   * Concatenate the HTML representations of items in the layout
   *
   * Since this class is just a collection and not an API object wrapper, we don't wrap the content
   * HTML in anything: Leave that up to `Page`, `Document`, etc.
   */
  html(opts?: IRenderOpts): string {
    return this.listItems({ deep: false, ...opts })
      .map((item) => item.html(opts))
      .filter((s) => s)
      .join("\n");
  }

  /**
   * Iterate through (just the top level, or all) the Items in the Layout.
   */
  iterItems({
    deep = true,
    includeBlockTypes = null,
    onUnexpectedBlockType = null,
    skipBlockTypes = null,
  }: IBlockTypeFilterOpts & INestedListOpts = {}): Iterable<LayoutItemGeneric<TPage>> {
    return getIterable(() =>
      this.listItems({ deep, includeBlockTypes, onUnexpectedBlockType, skipBlockTypes }),
    );
  }

  /**
   * List (just the top level, or all) the Items in the Layout.
   */
  listItems({
    deep = true,
    includeBlockTypes = null,
    onUnexpectedBlockType = null,
    skipBlockTypes = null,
  }: IBlockTypeFilterOpts & INestedListOpts = {}): LayoutItemGeneric<TPage>[] {
    let normIncludeBlockTypes = includeBlockTypes;
    if (normIncludeBlockTypes) {
      normIncludeBlockTypes = normalizeOptionalSet(normIncludeBlockTypes);
      normIncludeBlockTypes = setIntersection(LAYOUT_BLOCK_TYPES, normIncludeBlockTypes);
    } else {
      normIncludeBlockTypes = LAYOUT_BLOCK_TYPES;
    }

    const visitedIds = new Set<string>();
    const result: LayoutItemGeneric<TPage>[] = [];

    for (const item of this.parentPage.listRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: normIncludeBlockTypes,
      onUnexpectedBlockType,
      skipBlockTypes, // TODO: Specify base PAGE skipBlockTypes for better warn/error behaviour
    }) as Iterable<LayoutItemGeneric<TPage>>) {
      if (visitedIds.has(item.id)) continue;
      result.push(item);
      // PAGE children include all LAYOUT_* items, even those listed as children by each other.
      // Therefore if the user wants `deep`, we can just return the whole _items list... But
      // otherwise, we need to actively find and filter out the nested children:
      if (!deep) {
        item
          .listLayoutChildren({
            deep: true,
            includeBlockTypes,
            onUnexpectedBlockType,
            skipBlockTypes,
          })
          .forEach((child) => visitedIds.add(child.id));
      }
    }
    return result;
  }

  /**
   * The human-readable `str()` representation for a page layout
   *
   * This includes contained items' `str()`s, with bookends for clarity
   */
  str(): string {
    const content = this.listItems({ deep: false })
      .map((item) => item.str())
      .join("\n\n");
    return [
      "",
      "#### BEGIN PAGE LAYOUT #################",
      content,
      "#### END PAGE LAYOUT   #################",
      "",
    ].join("\n");
  }
}
