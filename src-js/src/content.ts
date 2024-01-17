/**
 * TRP classes for (generic document) low-level content objects
 */

// Local Dependencies:
import { ApiBlockType } from "./api-models/base";
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
  ApiBlockWrapper,
  Constructor,
  IApiBlockWrapper,
  IBlockManager,
  IRenderable,
  IWithParentPage,
  IWithText,
  PageHostedApiBlockWrapper,
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
   * Iterate through the Content items in this object
   * @example
   * for (const item of cell.iterContent()) {
   *   console.log(item.text);
   * }
   * @example
   * [...cell.iterContent()].forEach(
   *   (item) => console.log(item.text)
   * );
   */
  iterContent(): Iterable<TContent>;
  /**
   * List the Content items in this object
   */
  listContent(): Array<TContent>;
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
   * Set `true` to throw an error if content iteration finds a child not in `contentTypes`
   */
  strict?: boolean;
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
  strict = false,
}: IWithContentMixinOptions = {}) {
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
    T extends Constructor<IApiBlockWrapper<TBlock> & IWithParentPage<TPage>>
  >(SuperClass: T) {
    return class extends SuperClass implements IWithContent<TContent> {
      iterContent(): Iterable<TContent> {
        const getIterator = (): Iterator<TContent> => {
          const childBlockIds = this.childBlockIds;
          let ixCurr = 0;
          return {
            next: (): IteratorResult<TContent> => {
              let nextVal: TContent | undefined;
              while (ixCurr < childBlockIds.length) {
                const item = this.parentPage.getItemByBlockId(childBlockIds[ixCurr]);
                ++ixCurr;
                if (!contentTypes.length || contentTypes.indexOf(item.blockType) >= 0) {
                  nextVal = item as TContent;
                  break;
                } else if (strict) {
                  throw new Error(
                    `Child ${item.id} of parent ${this.id} has unexpected non-content block type ${item.blockType}`
                  );
                }
              }
              return nextVal ? { done: false, value: nextVal } : { done: true, value: undefined };
            },
          };
        };
        return {
          [Symbol.iterator]: getIterator,
        };
      }

      listContent(): Array<TContent> {
        if (!this.dict.Relationships) {
          // Many block types will simply omit the Relationships key if no content or other links
          // present - so this is not worth raising a warning over.
          return [];
        }

        const result: Array<TContent> = [];
        for (const cid of this.childBlockIds) {
          const item = this.parentPage.getItemByBlockId(cid);
          if (!contentTypes.length || contentTypes.indexOf(item.blockType) >= 0) {
            result.push(item as TContent);
          } else if (strict) {
            throw new Error(
              `Child ${item.id} of parent ${this.id} has unexpected non-content block type ${item.blockType}`
            );
          }
        }
        return result;
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
        return this.listContent()
          .map((c) => c.text)
          .join(" ");
      }
    };
  };
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
   * Iterate through the text `Word` items in this object
   * @example
   * for (const word of line.iterWords()) {
   *   console.log(word.text);
   * }
   * @example
   * [...line.iterWords()].forEach(
   *   (word) => console.log(word.text)
   * );
   */
  iterWords(): Iterable<Word>;
  /**
   * List the text `Word`s in this object
   */
  listWords(): Word[];
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
 */
export function WithWords<
  TBlock extends ApiBlock,
  TPage extends IBlockManager,
  T extends Constructor<IApiBlockWrapper<TBlock> & IWithParentPage<TPage>>
>(SuperClass: T) {
  return class extends SuperClass implements IWithWords {
    iterWords(): Iterable<Word> {
      const getIterator = (): Iterator<Word> => {
        const childBlockIds = this.childBlockIds;
        let ixCurr = 0;
        return {
          next: (): IteratorResult<Word> => {
            let nextVal: Word | undefined;
            while (ixCurr < childBlockIds.length) {
              const item = this.parentPage.getItemByBlockId(childBlockIds[ixCurr]);
              ++ixCurr;
              if (item.blockType === ApiBlockType.Word) {
                nextVal = item as Word;
                break;
              }
            }
            return nextVal ? { done: false, value: nextVal } : { done: true, value: undefined };
          },
        };
      };
      return {
        [Symbol.iterator]: getIterator,
      };
    }

    listWords(): Word[] {
      if (!this.dict.Relationships) {
        console.warn(
          `Tried to fetch WORD children on block ${this.id} of type ${this.blockType} with no 'Relationships'`
        );
        return [];
      }

      const result: Word[] = [];
      for (const cid of this.childBlockIds) {
        const item = this.parentPage.getItemByBlockId(cid);
        if (item.blockType === ApiBlockType.Word) result.push(item as Word);
      }
      return result;
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
      return this.listWords()
        .map((c) => c.text)
        .join(" ");
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
   * Whether the element is selected/ticked/checked/etc, or not
   */
  get selectionStatus(): ApiSelectionStatus {
    return this._dict.SelectionStatus;
  }
  set selectionStatus(newVal: ApiSelectionStatus) {
    this._dict.SelectionStatus = newVal;
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
