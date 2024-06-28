/**
 * TRP classes for (generic document) low-level content objects
 */

// Local Dependencies:
import { ApiBlockType, ApiRelationshipType } from "./api-models/base";
import {
  ApiLineBlock,
  ApiSelectionElementBlock,
  ApiSelectionStatus,
  ApiSignatureBlock,
  ApiTextType,
  ApiWordBlock,
} from "./api-models/content";
import { ApiBlock } from "./api-models/document";
import {
  ActionOnUnexpectedBlockType,
  ApiBlockWrapper,
  Constructor,
  doesFilterAllowBlockType,
  escapeHtml,
  IApiBlockWrapper,
  IBlockManager,
  IBlockTypeFilterOpts,
  IHostedApiBlockWrapper,
  IRenderable,
  IRenderOpts,
  IWithParentPage,
  IWithText,
  normalizeOptionalSet,
  PageHostedApiBlockWrapper,
  setIntersection,
  setUnion,
} from "./base";
import { Geometry, IWithGeometry } from "./geometry";

/**
 * TRP.js parsed object for an individual word of text
 *
 * Wraps an Amazon Textract `WORD` block in the underlying API response.
 */
export class Word
  extends ApiBlockWrapper<ApiWordBlock>
  implements IRenderable, IWithGeometry<ApiWordBlock, Word>
{
  _geometry: Geometry<ApiWordBlock, Word>;

  constructor(block: ApiWordBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  /**
   * 0-100 based confidence of the OCR model in extracting the text of this word
   */
  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  /**
   * Position of the word on the input image / page
   */
  get geometry(): Geometry<ApiWordBlock, Word> {
    return this._geometry;
  }
  /**
   * Text extracted by the OCR model
   */
  get text(): string {
    return this._dict.Text;
  }
  /**
   * Whether the text appears hand-written or computer-generated
   */
  get textType(): ApiTextType {
    return this._dict.TextType;
  }
  set textType(newVal: ApiTextType) {
    this._dict.TextType = newVal;
  }

  /**
   * The semantic `html()` representation of a `Word` is just the (HTML-escaped) text
   */
  html(opts?: IRenderOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    return escapeHtml(this.text);
  }

  /**
   * The basic human-readable `str()` representation of a `Word` is just the `.text`
   */
  str(): string {
    return this.text;
  }
}

/**
 * Interface for objects that have child items representing actual "content"
 *
 * Typically used for containers of low-level content items like `Word`s and `SelectionElement`s.
 * In some cases (like Layout), higher-level containers (of items like `LINE` may use the same
 * interface.
 *
 * For objects guaranteed to contain only `Word`s (no `SelectionElement`s), prefer `IWithWords`
 * instead.
 */
export interface IWithContent<TContent extends IApiBlockWrapper<ApiBlock> & IRenderable> extends IWithText {
  /**
   * Number of content items in this object
   */
  get nContentItems(): number;
  /**
   * Return the text content of this element, with additional options
   *
   * Unlike the plain `.text` property, this method supports filtering which block types are
   * included and controlling behaviour when unexpected ones are encountered.
   *
   * @param opts Optional configuration for filtering rendering to certain content types
   */
  getText(opts?: IBlockTypeFilterOpts): string;
  /**
   * Iterate through the Content items in this object
   *
   * Optionally filter certain content Block types by specifying `opts`
   *
   * @example
   * for (const item of cell.iterContent()) {
   *   console.log(item.text);
   * }
   * @example
   * [...cell.iterContent({ skipBlockTypes: [ApiBlockType.SelectionElement] })].forEach(
   *   (item) => console.log(item.text)
   * );
   */
  iterContent(opts?: IBlockTypeFilterOpts): Iterable<TContent>;
  /**
   * List the Content items in this object
   */
  listContent(opts?: IBlockTypeFilterOpts): Array<TContent>;
}

/**
 * Configuration options for WithContent mixin (see `buildWithContent`)
 */
export interface IWithContentMixinOptions {
  /**
   * What types of direct Child Block to consider as "content"
   *
   * Defaults to [SELECTION_ELEMENT, SIGNATURE, WORD] as per `buildWithContent`
   */
  contentTypes?: ApiBlockType[];

  /**
   * Action to take on encountering a child Block of unexpected BlockType
   *
   * Set "error" to throw an error, "warn" to log a warning, or falsy to skip silently.
   */
  onUnexpectedBlockType?: ActionOnUnexpectedBlockType;

  /**
   * Other types of direct child block that are expected but non-content
   *
   * This is optional to specify, but setting it up will provide more useful behaviour when using
   * strict `onUnexpectedBlockType`s settings.
   */
  otherExpectedChildTypes?: ApiBlockType[] | null;
}

/**
 * Mixin factory for elements that have child Content (such as `Word`s and/or `SelectionElement`s)
 *
 * While it's possible to apply a TS mixin to a generic base class (with expressions like
 * `extends MyMixin(BaseClass)<TBaseArgs...>`), mixins cannot alter the base class' constructor
 * signature so they can't introduce additional type arguments (generic aspects) of their own. This
 * double-call mixin factory pattern provides a workaround *only* for cases where we're able to
 * specify the mixin type arguments at the point it's applied: Enabling a somewhat generic
 * definition of "content" that consumer classes can dictate.
 *
 * For objects guaranteed to contain only `Word` items, prefer `WithWords` instead.
 *
 * See: https://stackoverflow.com/a/48492205/13352657
 *
 * @param contentBlockTypes API block types to be included when listing child "Content". Set `[]`
 *    to disable this filter and preserve all items
 */
export function buildWithContent<TContent extends IApiBlockWrapper<ApiBlock> & IRenderable>({
  contentTypes = [ApiBlockType.SelectionElement, ApiBlockType.Signature, ApiBlockType.Word],
  onUnexpectedBlockType = null,
  otherExpectedChildTypes = null,
}: IWithContentMixinOptions = {}) {
  // (contentTypes cannot be `undefined` or null because of the default value)
  const contentTypesSet: Set<ApiBlockType> = new Set(contentTypes);
  const defaultOnUnexpected = onUnexpectedBlockType; // Need to rename because it'll be shadowed
  const otherTypesSet: Set<ApiBlockType> = otherExpectedChildTypes
    ? new Set(otherExpectedChildTypes)
    : new Set();
  /**
   * TypeScript mixin for a container `Block` wrapper whose `Child` blocks are actual content
   *
   * (For example a LINE of text, or a CELL/MERGED_CELL)
   *
   * @param SuperClass Base class to be extended with the mixin properties
   */
  return function WithContent<
    TBlock extends ApiBlock,
    TPage extends IBlockManager,
    T extends Constructor<IHostedApiBlockWrapper<TBlock, TPage>>,
  >(SuperClass: T) {
    return class extends SuperClass implements IWithContent<TContent> {
      getText(opts?: IBlockTypeFilterOpts) {
        if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
        return this.listContent(opts)
          .map((c) => c.text)
          .join(" ");
      }

      iterContent({
        includeBlockTypes = null,
        onUnexpectedBlockType = defaultOnUnexpected,
        skipBlockTypes = null,
      }: IBlockTypeFilterOpts = {}): Iterable<TContent> {
        if (includeBlockTypes) {
          includeBlockTypes = normalizeOptionalSet(includeBlockTypes);
          includeBlockTypes = setIntersection(contentTypesSet, includeBlockTypes);
        } else {
          includeBlockTypes = contentTypesSet;
        }
        if (skipBlockTypes) {
          skipBlockTypes;
          skipBlockTypes = normalizeOptionalSet(skipBlockTypes);
          skipBlockTypes = setUnion(skipBlockTypes, otherTypesSet);
        } else {
          skipBlockTypes = otherTypesSet;
        }
        return this.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
          includeBlockTypes,
          onUnexpectedBlockType,
          skipBlockTypes,
        }) as Iterable<TContent>;
      }

      listContent({
        includeBlockTypes = null,
        onUnexpectedBlockType = defaultOnUnexpected,
        skipBlockTypes = null,
      }: IBlockTypeFilterOpts = {}): Array<TContent> {
        if (includeBlockTypes) {
          includeBlockTypes = normalizeOptionalSet(includeBlockTypes);
          includeBlockTypes = setIntersection(contentTypesSet, includeBlockTypes);
        } else {
          includeBlockTypes = contentTypesSet;
        }
        if (skipBlockTypes) {
          skipBlockTypes;
          skipBlockTypes = normalizeOptionalSet(skipBlockTypes);
          skipBlockTypes = setUnion(skipBlockTypes, otherTypesSet);
        } else {
          skipBlockTypes = otherTypesSet;
        }
        return this.listRelatedItemsByRelType(ApiRelationshipType.Child, {
          includeBlockTypes,
          onUnexpectedBlockType,
          skipBlockTypes,
        }) as TContent[];
      }

      get nContentItems(): number {
        return this.listContent().length;
      }

      /**
       * A default text representation getter that concatenates child content separated by spaces
       *
       * Objects (like `Line`) that define their own representation of the overall text or need to
       * join content with something other than a space (like a newline) should override this.
       */
      get text(): string {
        return this.getText();
      }
    };
  };
}

/**
 * Configuration options for WithWords mixin
 */
export interface IWithWordsMixinOptions {
  /**
   * Action to take on encountering a child Block of unexpected BlockType
   *
   * Set "error" to throw an error, "warn" to log a warning, or falsy to skip silently.
   */
  onUnexpectedBlockType?: ActionOnUnexpectedBlockType;

  /**
   * Other types of direct child block that are expected but non-content
   *
   * This is optional to specify, but setting it up will provide more useful behaviour when using
   * strict `onUnexpectedBlockType`s settings.
   */
  otherExpectedChildTypes?: ApiBlockType[] | null;
}

/**
 * Interface for objects that have child `Word`s (such as LINEs of text)
 *
 * For objects that might contain `SelectionElement`s as well (such as table cells), use
 * `IWithContent` instead.
 */
export interface IWithWords extends IWithText {
  /**
   * Number of text Words in this object
   */
  get nWords(): number;
  /**
   * Return the text content of this element, with additional options
   *
   * Unlike the plain `.text` property, this method supports controlling error behaviour when
   * non-WORD blocks are encountered.
   *
   * @param opts Optional configuration for filtering rendering to certain content types
   */
  getText(opts?: IBlockTypeFilterOpts): string;
  /**
   * Iterate through the text `Word` items in this object
   *
   * Optionally control what happens when unexpected (non-Word) block types are encountered, by
   * specifying filter `opts`.
   *
   * @example
   * for (const word of line.iterWords()) {
   *   console.log(word.text);
   * }
   * @example
   * [...line.iterWords()].forEach(
   *   (word) => console.log(word.text)
   * );
   */
  iterWords(opts?: IBlockTypeFilterOpts): Iterable<Word>;
  /**
   * List the text `Word`s in this object
   *
   * Optionally control what happens when unexpected (non-Word) block types are encountered, by
   * specifying filter `opts`.
   */
  listWords(opts?: IBlockTypeFilterOpts): Word[];
  /**
   * Fetch a particular text `Word` in this object by index from 0 to `.nWords - 1`
   * @param ix 0-based index in the word list
   * @throws if the index is out of bounds
   */
  wordAtIndex(ix: number): Word;
}

/**
 * Mixin for page-hosted API block wrappers with CHILD relations to WORD objects
 *
 * Adds dynamic functionality to list and traverse the Word objects contained in the content, and a
 * basic implementation for getting the overall `.text`.
 *
 * @param SuperClass The class to extend
 * @param opts Configuration options for how to handle other (non-WORD) child blocks
 */
export function WithWords<
  TBlock extends ApiBlock,
  TPage extends IBlockManager,
  T extends Constructor<IHostedApiBlockWrapper<TBlock, TPage> & IWithParentPage<TPage>>,
>(
  SuperClass: T,
  { onUnexpectedBlockType = null, otherExpectedChildTypes = null }: IWithWordsMixinOptions = {},
) {
  const contentTypesSet = new Set([ApiBlockType.Word]);
  const defaultOnUnexpected = onUnexpectedBlockType; // Need to rename because it'll be shadowed
  const otherTypesSet: Set<ApiBlockType> = otherExpectedChildTypes
    ? new Set(otherExpectedChildTypes)
    : new Set();
  return class extends SuperClass implements IWithWords {
    getText(opts?: IBlockTypeFilterOpts) {
      if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
      return this.listWords(opts)
        .map((w) => w.text)
        .join(" ");
    }

    iterWords({
      includeBlockTypes = null,
      onUnexpectedBlockType = defaultOnUnexpected,
      skipBlockTypes = null,
    }: IBlockTypeFilterOpts = {}): Iterable<Word> {
      if (includeBlockTypes) {
        includeBlockTypes = normalizeOptionalSet(includeBlockTypes);
        includeBlockTypes = setIntersection(contentTypesSet, includeBlockTypes);
      } else {
        includeBlockTypes = contentTypesSet;
      }
      if (skipBlockTypes) {
        skipBlockTypes;
        skipBlockTypes = normalizeOptionalSet(skipBlockTypes);
        skipBlockTypes = setUnion(skipBlockTypes, otherTypesSet);
      } else {
        skipBlockTypes = otherTypesSet;
      }
      return this.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
        includeBlockTypes,
        onUnexpectedBlockType,
        skipBlockTypes,
      }) as Iterable<Word>;
    }

    listWords({
      includeBlockTypes = null,
      onUnexpectedBlockType = defaultOnUnexpected,
      skipBlockTypes = null,
    }: IBlockTypeFilterOpts = {}): Word[] {
      if (includeBlockTypes) {
        includeBlockTypes = normalizeOptionalSet(includeBlockTypes);
        includeBlockTypes = setIntersection(contentTypesSet, includeBlockTypes);
      } else {
        includeBlockTypes = contentTypesSet;
      }
      if (skipBlockTypes) {
        skipBlockTypes;
        skipBlockTypes = normalizeOptionalSet(skipBlockTypes);
        skipBlockTypes = setUnion(skipBlockTypes, otherTypesSet);
      } else {
        skipBlockTypes = otherTypesSet;
      }
      return this.listRelatedItemsByRelType(ApiRelationshipType.Child, {
        includeBlockTypes,
        onUnexpectedBlockType,
        skipBlockTypes,
      }) as Word[];
    }

    get nWords(): number {
      return this.listWords().length;
    }

    /**
     * A default text representation getter that concatenates child `Word`s separated by spaces
     *
     * Objects (like `Line`) that define their own representation of the overall text or need to
     * join words with something other than a space (like a newline) should override this.
     */
    get text(): string {
      return this.getText();
    }

    wordAtIndex(ix: number): Word {
      if (ix < 0) throw new Error(`Word index ${ix} must be >=0`);
      let ixCurr = 0;
      for (const word of this.iterWords()) {
        if (ixCurr === ix) return word;
        ++ixCurr;
      }
      throw new Error(`Word index ${ix} out of bounds for length ${ixCurr}`);
    }
  };
}

/**
 * Generic base class for a Line, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/Line`.
 */
export class LineGeneric<TPage extends IBlockManager>
  extends WithWords(PageHostedApiBlockWrapper)<ApiLineBlock, TPage>
  implements IRenderable, IWithGeometry<ApiLineBlock, LineGeneric<TPage>>
{
  _geometry: Geometry<ApiLineBlock, LineGeneric<TPage>>;

  constructor(block: ApiLineBlock, parentPage: TPage) {
    super(block, parentPage);
    this._geometry = new Geometry(block.Geometry, this);
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  /**
   * Position of the text line on the input image / page
   */
  get geometry(): Geometry<ApiLineBlock, LineGeneric<TPage>> {
    return this._geometry;
  }
  /**
   * Text content of the LINE
   *
   * This uses the pre-calculated `.Text` property on the Block, rather than concatenating WORDs
   */
  override get text(): string {
    return this._dict.Text;
  }

  /**
   * Fetch the text in this line with filtering options
   *
   * Note that since `LINE.Text` comes directly from Textract, filtering out `ApiBlockType.Word`
   * won't have any effect here.
   *
   * @param opts Optional configuration for filtering rendering to certain content types
   */
  override getText(opts?: IBlockTypeFilterOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    return this._dict.Text;
  }

  /**
   * The semantic `html()` representation of a `Line` is just the (HTML-escaped) text
   *
   * Note that since `LINE.Text` comes directly from Textract, filtering out `ApiBlockType.Word`
   * won't have any effect here.
   */
  html(opts?: IRenderOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    return escapeHtml(this.text);
  }

  str(): string {
    return `Line\n==========\n${this._dict.Text}\nWords\n----------\n${this.listWords()
      .map((word) => `[${word.str()}]`)
      .join("")}`;
  }
}

/**
 * TRP.js parsed object for a selection element, such as a checkbox or radio selector
 *
 * Wraps an Amazon Textract `SELECTION_ELEMENT` block in the underlying API response.
 */
export class SelectionElement
  extends ApiBlockWrapper<ApiSelectionElementBlock>
  implements IRenderable, IWithGeometry<ApiSelectionElementBlock, SelectionElement>
{
  _geometry: Geometry<ApiSelectionElementBlock, SelectionElement>;

  constructor(block: ApiSelectionElementBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  /**
   * 0-100 based confidence of the model detecting this selection element and its status
   */
  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  /**
   * Position of the selection element on the input image / page
   */
  get geometry(): Geometry<ApiSelectionElementBlock, SelectionElement> {
    return this._geometry;
  }
  /**
   * `true` if SELECTED, `false` if NOT_SELECTED, or raise an error if some unexpected value
   */
  get isSelected(): boolean {
    if (this.selectionStatus === ApiSelectionStatus.Selected) return true;
    if (this.selectionStatus === ApiSelectionStatus.NotSelected) return false;
    throw new Error(`Block ${this.id} has unexpected SelectionStatus: ${this.selectionStatus}`);
  }
  /**
   * Whether the element is selected/ticked/checked/etc, or not
   */
  get selectionStatus(): ApiSelectionStatus {
    return this._dict.SelectionStatus;
  }
  set selectionStatus(newVal: ApiSelectionStatus) {
    this._dict.SelectionStatus = newVal;
  }

  /**
   * The semantic `html()` representation of a `SelectionElement` uses an `<input>` element
   *
   * We render a checkbox, but `disable` it to prevent accidental edits when viewing reports
   */
  html(opts?: IRenderOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    return `<input type="checkbox" disabled ${
      this.selectionStatus === ApiSelectionStatus.Selected ? "checked " : ""
    }/>`;
  }

  /**
   * The human-readable `str()` representation of a sel. element is just the `.selectionStatus`
   */
  str(): string {
    return this.selectionStatus;
  }

  /**
   * The "text content" of a sel. element is just the `.selectionStatus`
   */
  get text(): string {
    return this.selectionStatus;
  }
}

/**
 * TRP.js parsed object for a detected signature
 *
 * Wraps an Amazon Textract `SIGNATURE` block in the underlying API response.
 */
export class Signature
  extends ApiBlockWrapper<ApiSignatureBlock>
  implements IRenderable, IWithGeometry<ApiSignatureBlock, Signature>
{
  _geometry: Geometry<ApiSignatureBlock, Signature>;

  constructor(block: ApiSignatureBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  /**
   * 0-100 based confidence of the model detecting this selection element and its status
   */
  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  /**
   * Position of the selection element on the input image / page
   */
  get geometry(): Geometry<ApiSignatureBlock, Signature> {
    return this._geometry;
  }

  /**
   * The semantic `html()` representation of a `SelectionElement` uses an `<input>` element
   *
   * We render a checkbox, but `disable` it to prevent accidental edits when viewirg reports
   */
  html(opts?: IRenderOpts): string {
    if (!doesFilterAllowBlockType(opts, this.blockType)) return "";
    return `<input class="signature" type="text" disabled value="[SIGNATURE]"/>`;
  }

  /**
   * The human-readable `str()` representation of a signature is a placeholder
   *
   * Looks like:
   *
   * /-------------\
   * | [SIGNATURE] |
   * \-------------/
   */
  str(): string {
    return "/-------------\\\n| [SIGNATURE] |\n\\-------------/";
  }

  /**
   * The "text content" of a signature element is empty
   */
  get text(): "" {
    return "";
  }
}
