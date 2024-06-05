/**
 * Common shared utilities, interfaces, etc.
 */

// Local Dependencies:
import { ApiBlockType, ApiRelationshipType } from "./api-models/base";
import { ApiBlock } from "./api-models/document";
import { ApiDocumentMetadata } from "./api-models/response";

/**
 * Generic typing for a concrete class constructor to support TypeScript Mixins pattern
 *
 * (could use `abstract new` to type abstract base clasess)
 *
 * See: https://www.typescriptlang.org/docs/handbook/mixins.html
 */
export type Constructor<T> = new (...args: any[]) => T; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Base class for all classes which wrap over an actual Textract API object.
 *
 * Exposes the underlying object for access as `dict`.
 */
export class ApiObjectWrapper<T> {
  _dict: T;

  constructor(dict: T) {
    this._dict = dict;
  }

  /**
   * Raw underlying Amazon Textract API object that this parsed item wraps
   */
  get dict(): T {
    return this._dict;
  }
}

/**
 * Basic properties exposed by all classes which wrap over a Textract API `Block` object.
 */
export interface IApiBlockWrapper<T extends ApiBlock> {
  /**
   * Raw underlying Amazon Textract API `Block` object that this parsed item wraps
   */
  get dict(): T;
  /**
   * Unique ID of the underlying Amazon Textract API `Block` object that this parsed item wraps
   */
  get id(): string;
  /**
   * Type of underlying Amazon Textract API `Block` object that this parsed item wraps
   */
  get blockType(): ApiBlockType;
  /**
   * Dynamic accessor for the unique Block IDs of all CHILD relationships from this Block
   */
  get childBlockIds(): string[];
  /**
   * Fetch the unique Block IDs of this block's `Relationships`, filtered by type(s)
   * @param relType Only keep IDs corresponding to relations of this type (or list of types)
   */
  relatedBlockIdsByRelType(relType: ApiRelationshipType | ApiRelationshipType[]): string[];
}

export interface IWithText {
  /**
   * Return the text content of this element (and any child content)
   *
   * Unlike `.str()`, this includes only the actual text content and no semantic information.
   */
  get text(): string;
}

export interface IRenderable extends IWithText {
  /**
   * Return a best-effort semantic HTML representation of this element and its content
   */
  html(): string;

  // TODO: Add Markdown options in future?

  /**
   * Return a text representation of this element and its content
   *
   * Unlike `.text`, this may include additional characters to try and communicate the type of the
   * element for an overall representation of a page.
   */
  str(): string;
}

/**
 * Base for classes which wrap over a Textract API 'Block' object.
 */
export class ApiBlockWrapper<T extends ApiBlock> extends ApiObjectWrapper<T> implements IApiBlockWrapper<T> {
  get id(): string {
    return this._dict.Id;
  }

  get blockType(): ApiBlockType {
    return this._dict.BlockType;
  }

  get childBlockIds(): string[] {
    return this.relatedBlockIdsByRelType(ApiRelationshipType.Child);
  }

  relatedBlockIdsByRelType(relType: ApiRelationshipType | ApiRelationshipType[]): string[] {
    const isMultiType = Array.isArray(relType);
    let ids: string[] = [];
    (this._dict.Relationships || []).forEach((rs) => {
      if (isMultiType) {
        if (relType.indexOf(rs.Type) >= 0) {
          ids = ids.concat(rs.Ids);
        }
      } else {
        if (rs.Type === relType) {
          ids = ids.concat(rs.Ids);
        }
      }
    });
    return ids;
  }
}

/**
 * Parsed TRP object representing a document metadata descriptor from a Textract API result
 *
 * You'll usually create this via `TextractDocument`, `TextractExpense`, `TextractIdentity`
 * classes, etc - rather than directly.
 */
export class DocumentMetadata extends ApiObjectWrapper<ApiDocumentMetadata> {
  /**
   * Number of pages in the document, according to the Amazon Textract DocumentMetadata field
   */
  get nPages(): number {
    return this._dict?.Pages || 0;
  }
}

/**
 * Configuration options for iterating nested lists
 */
export interface INestedListOpts {
  /**
   * Include nested children (true) or top-level items only (false)
   */
  deep?: boolean;
}

/**
 * Utility function to create an iterable from a collection
 *
 * Input is a collection *fetching function*, rather than a direct collection, in case a user
 * re-uses the iterable after the parent object is mutated. For example:
 *
 * @example
 * const iterWords = line.iterWords(); // Implemented with getIterable(() => this._words)
 * let words = [...iterWords];
 * line._words = [];
 * let words = [...iterWords]; // Should return [] as expected
 */
export function getIterable<T>(collectionFetcher: () => T[]): Iterable<T> {
  const getIterator = (): Iterator<T> => {
    const collection = collectionFetcher();
    let ixItem = 0;
    return {
      next: (): IteratorResult<T> => {
        return ixItem < collection.length
          ? {
              done: false,
              value: collection[ixItem++],
            }
          : {
              done: true,
              value: undefined,
            };
      },
    };
  };
  return {
    [Symbol.iterator]: getIterator,
  };
}

/**
 * Configuration options for escaping text for HTML
 */
export interface IEscapeHtmlOpts {
  /**
   * Set true if escaping within an element attribute <el attr="...">
   *
   * For standard text nodes, there's no need to escape single or double quotes
   * @default false;
   */
  forAttr?: boolean;
}

/**
 * Escape a document text string for use in HTML (TextNodes only by default)
 * @param str Raw text to be escaped
 * @returns Escaped string ready to be used in a HTML document
 */
export function escapeHtml(str: string, { forAttr = false }: IEscapeHtmlOpts = {}): string {
  return str.replace(
    forAttr ? /[&<>'"]/g : /[&<>]/g,
    (entity) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[entity] as string,
  );
}

/**
 * Configuration options for indenting text
 */
export interface IIndentOpts {
  /**
   * The character/string that should be used to indent text.
   *
   * We default to 1x tab (rather than e.g. 2x spaces) to minimize token count for LLM use-cases
   *
   * @default "\t"
   */
  character?: string;
  /**
   * The number of times the indent `character` should be repeated.
   *
   * We default to 1x tab (rather than e.g. 2x spaces) to minimize token count for LLM use-cases
   *
   * @default 1
   */
  count?: number;
  /**
   * Whether indentation should also be applied to empty & whitespace-only lines.
   * @default false
   */
  includeEmptyLines?: boolean;
  /**
   * Set true to skip the first line of text when applying indentation
   * @default false
   */
  skipFirstLine?: boolean;
}

/**
 * Indent all lines of `text` by a certain amount
 */
export function indent(
  text: string,
  { character = "\t", count = 1, includeEmptyLines = false, skipFirstLine = false }: IIndentOpts = {},
): string {
  const result = text.replace(includeEmptyLines ? /^/gm : /^(?!\s*$)/gm, character.repeat(count));
  if (skipFirstLine) {
    return result.substring(count * character.length);
  } else {
    return result;
  }
}

/**
 * Statistical methods for aggregating multiple scores/numbers into one representative value
 *
 * Different use-cases may wish to use different aggregations: For example summarizing OCR
 * confidence for a whole page or region based on the individual words/lines.
 */
export const enum AggregationMethod {
  GeometricMean = "GEOMEAN",
  Max = "MAX",
  Mean = "MEAN",
  Min = "MIN",
  Mode = "MODE",
}

/**
 * Get the most common value in an Iterable of numbers
 *
 * @returns The most common value, or null if `arr` was empty.
 */
export function modalAvg(arr: Iterable<number>): number | null {
  const freqs: { [key: number]: { value: number; freq: number } } = {};
  for (const item of arr) {
    if (freqs[item]) {
      ++freqs[item].freq;
    } else {
      freqs[item] = { value: item, freq: 1 };
    }
  }

  let maxFreq = 0;
  let mode: number | null = null;
  for (const item in freqs) {
    if (freqs[item].freq > maxFreq) {
      maxFreq = freqs[item].freq;
      mode = freqs[item].value;
    }
  }
  return mode;
}

/**
 * Summarize an Iterable of numbers using a statistic of your choice
 *
 * If `arr` is empty, this function will return `null`.
 */
export function aggregate(arr: Iterable<number>, aggMethod: AggregationMethod): number | null {
  // Altough some aggregations could process streaming-style, we'd need to implement zero-length
  // detection separately for each one. Therefore simplest method is just to extract arr as an
  // actual array up-front:
  const actualArr: Array<number> = Array.isArray(arr) ? arr : Array.from(arr);
  if (actualArr.length === 0) return null;

  if (aggMethod === AggregationMethod.GeometricMean) {
    // Performing arithmetic mean in logspace better numerically conditioned than just multiplying:
    return Math.exp(actualArr.reduce((acc, next) => acc + Math.log(next), 0) / actualArr.length);
  } else if (aggMethod === AggregationMethod.Max) {
    return Math.max(...actualArr);
  } else if (aggMethod === AggregationMethod.Mean) {
    return actualArr.reduce((acc, next) => acc + next, 0) / actualArr.length;
  } else if (aggMethod === AggregationMethod.Min) {
    return Math.min(...actualArr);
  } else if (aggMethod === AggregationMethod.Mode) {
    return modalAvg(actualArr);
  } else {
    throw new Error(`Unsupported aggMethod '${aggMethod}' not in allowed AggregationMethod enum`);
  }
}

/**
 * Extract the maximum value and the first index where it appears from an array of numbers
 *
 * If `arr` is empty or no elements are numeric, this function will return a value of `-Infinity`
 * and an index of `-1`.
 */
export function argMax(arr: number[]): { maxValue: number; maxIndex: number } {
  return arr.reduce(
    (state, nextVal, nextIx) => (nextVal > state.maxValue ? { maxValue: nextVal, maxIndex: nextIx } : state),
    { maxValue: -Infinity, maxIndex: -1 },
  );
}

/**
 * Configuration options for filtering collections of Textract API "Block"s by type
 */
export interface IBlockTypeFilterOpts {
  /**
   * Only return API Blocks of the given type(s)
   *
   * By default, all blocks are returned unless otherwise documented.
   */
  includeBlockTypes?: ApiBlockType | ApiBlockType[] | Set<ApiBlockType> | null;
  /**
   * Action to take on encountering a Block of unexpected BlockType
   *
   * Set "error" to throw an error, "warn" to log a warning, or falsy to skip silently.
   */
  onUnexpectedBlockType?: "error" | "warn" | null;
  /**
   * Block types to silently skip/ignore in the results
   */
  skipBlockTypes?: ApiBlockType[] | Set<ApiBlockType> | null;
}

/**
 * Normalize an optional Set-like or individual-object parameter to a Set
 */
export function normalizeOptionalSet<T, TArg extends T | T[] | Set<T> | null | undefined>(
  raw: TArg,
): T extends null ? null : T extends undefined ? undefined : Set<T>;
export function normalizeOptionalSet<T>(raw: T | T[] | Set<T> | null | undefined): Set<T> | null {
  if (raw instanceof Set) return raw;
  if (raw === null || typeof raw === "undefined") return null;
  if (Array.isArray(raw)) return new Set(raw);
  return new Set([raw]);
}

/**
 * Polyfill for Set.intersection() which is not available in all our target runtimes
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/intersection
 */
export function setIntersection<T>(a: Set<T>, b: Set<T>) {
  const result = new Set(a);
  for (const entry of result) {
    if (!b.has(entry)) result.delete(entry);
  }
  return result;
}

/**
 * Polyfill for Set.union() which is not available in all our target runtimes
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/union
 */
export function setUnion<T>(a: Set<T>, b: Set<T>) {
  const result = new Set(a);
  for (const entry of b) {
    result.add(entry);
  }
  return result;
}

/**
 * Interface for a (TextractDocument-like) object that can query Textract Blocks
 *
 * Unlike `IBlockManager` (below), implementers of `IDocBlocks` can only query underlying API Block
 * objects - and not their associated parsed TRP items.
 *
 * This interface is used to avoid circular references in child classes which need to reference some
 * TextractDocument-like parent, before the actual TextractDocument class is defined.
 */
export interface IDocBlocks {
  /**
   * Retrieve an underlying Amazon Textract API `Block` response object by its unique ID
   */
  getBlockById: { (blockId: string): ApiBlock | undefined };
  /**
   * List all underlying Amazon Textract API `Block` objects managed by this parser
   */
  listBlocks: { (): ApiBlock[] };
}

/**
 * Interface for a (Page-like) object that can query Textract Blocks and their parsed wrapper items
 *
 * This interface extends `IDocBlocks` to also support looking up parsed TRP items by underlying
 * `Block` ID. It's used to avoid circular references in child classes which need to reference some
 * Page-like parent, before the actual Page class is defined.
 */
export interface IBlockManager extends IDocBlocks {
  /**
   * Return a parsed TRP.js object corresponding to an API Block
   *
   * The return value is *nearly* always some subtype of `ApiBlockWrapper`, except that for form
   * fields we return the overall `Field` object instead of the `FieldKey`.
   *
   * @param blockId Unique ID of the API Block for which a parsed object should be fetched
   * @param allowBlockTypes Optional restriction on acceptable ApiBlockType(s) to return
   * @throws If no parsed object exists for the block ID, or it doesn't match `allowBlockTypes`
   */
  getItemByBlockId(
    blockId: string,
    allowBlockTypes?: ApiBlockType | ApiBlockType[] | null,
  ): IApiBlockWrapper<ApiBlock>;
  /**
   * Register a newly parsed ApiBlockWrapper for a particular block ID
   *
   * In cases where a BlockManager devolves parsing certain block types down to an intermediate
   * layer (e.g. QueryInstance parsing related QueryResult blocks) - the lower parser should use
   * this function to register the created items with the block manager to allow later retrieval.
   *
   * @param blockId Unique ID of the API Block for which a parsed object should be registered
   * @param allowBlockTypes Optional restriction on acceptable ApiBlockType(s) to return
   * @throws If no parsed object exists for the block ID, or it doesn't match `allowBlockTypes`
   */
  registerParsedItem(blockId: string, item: IApiBlockWrapper<ApiBlock>): void;
}

/**
 * Interface for objects that track a reference to the Page on which they're defined
 */
export interface IWithParentPage<TPage extends IBlockManager> {
  /**
   * Parsed TRP.js `Page` that this object is a member of
   */
  parentPage: TPage;
}

/**
 * Base interface for classes which wrap over a Textract API `Block` *and* are parent doc/page-aware
 *
 * Holding a reference to the hosting page/document allows direct lookup of related parsed objects.
 */
export interface IHostedApiBlockWrapper<TBlock extends ApiBlock, TPage extends IBlockManager>
  extends ApiBlockWrapper<TBlock>,
    IWithParentPage<TPage> {
  /**
   * Iterate through directly related Blocks' parsed wrapper items, with optional filters
   *
   * This low-level method traverses the `Relationships` of the wrapped block, but looks up the
   * linked block IDs to return the actual parsed wrapper items for each target - since that's
   * usually what you'll want to work with anyway.
   *
   * TODO: Can we guarantee returned items are also `IHostedApiBlockWrapper`s?
   *
   * @param relType Type(s) of relationships to consider
   * @param opts Options for filtering the returned items
   */
  iterRelatedItemsByRelType(
    relType: ApiRelationshipType | ApiRelationshipType[],
    opts?: IBlockTypeFilterOpts,
  ): Iterable<IApiBlockWrapper<ApiBlock>>;

  /**
   * List directly related Blocks' parsed wrapper items, with optional filters
   *
   * This low-level method traverses the `Relationships` of the wrapped block, but looks up the
   * linked block IDs to return the actual parsed wrapper items for each target - since that's
   * usually what you'll want to work with anyway.
   *
   * TODO: Can we guarantee returned items are also `IHostedApiBlockWrapper`s?
   *
   * @param relType Type(s) of relationships to consider
   * @param opts Options for filtering the returned items
   */
  listRelatedItemsByRelType(
    relType: ApiRelationshipType | ApiRelationshipType[],
    opts?: IBlockTypeFilterOpts,
  ): IApiBlockWrapper<ApiBlock>[];
}

/**
 * Base class for an item parser wrapping Textract `Block` object, that tracks its parent page
 *
 * Items derived from this base automatically register themselves with the parent page on construct
 */
export class PageHostedApiBlockWrapper<TBlock extends ApiBlock, TPage extends IBlockManager>
  extends ApiBlockWrapper<TBlock>
  implements IHostedApiBlockWrapper<TBlock, TPage>
{
  _parentPage: TPage;

  constructor(dict: TBlock, parentPage: TPage) {
    super(dict);
    this._parentPage = parentPage;
    parentPage.registerParsedItem(dict.Id, this);
  }

  get parentPage(): TPage {
    return this._parentPage;
  }

  iterRelatedItemsByRelType(
    relType: ApiRelationshipType | ApiRelationshipType[],
    {
      includeBlockTypes = null,
      onUnexpectedBlockType = null,
      skipBlockTypes = null,
    }: IBlockTypeFilterOpts = {},
  ): Iterable<IApiBlockWrapper<ApiBlock>> {
    // Normalize optional set parameters:
    includeBlockTypes = normalizeOptionalSet(includeBlockTypes);
    skipBlockTypes = normalizeOptionalSet(skipBlockTypes);

    const getIterator = (): Iterator<IApiBlockWrapper<ApiBlock>> => {
      const blockIds = this.relatedBlockIdsByRelType(relType);
      let ixItem = 0;
      return {
        next: (): IteratorResult<IApiBlockWrapper<ApiBlock>> => {
          while (ixItem < blockIds.length) {
            const blockId = blockIds[ixItem++];
            // TODO: Directly support IBlockTypeFilterOpts in getItemByBlockId maybe?
            const item = this.parentPage.getItemByBlockId(blockId);
            if (skipBlockTypes && skipBlockTypes.has(item.blockType)) continue;
            if (includeBlockTypes && !includeBlockTypes.has(item.blockType)) {
              if (!onUnexpectedBlockType) continue;
              const msg = `(While iterating ${relType} relations of parent ${this.id}) Found unexpected block ID ${blockId} of type ${item.blockType} not in set ${Array.from(includeBlockTypes)}`;
              if (onUnexpectedBlockType === "warn") {
                console.warn(msg);
                continue;
              } else {
                throw new Error(msg);
              }
            }
            return {
              done: false,
              value: item,
            };
          }
          return {
            done: true,
            value: undefined,
          };
        },
      };
    };
    return {
      [Symbol.iterator]: getIterator,
    };
  }

  listRelatedItemsByRelType(
    relType: ApiRelationshipType | ApiRelationshipType[],
    {
      includeBlockTypes = null,
      onUnexpectedBlockType = null,
      skipBlockTypes = null,
    }: IBlockTypeFilterOpts = {},
  ): IApiBlockWrapper<ApiBlock>[] {
    // Normalize optional set parameters:
    includeBlockTypes = normalizeOptionalSet(includeBlockTypes);
    skipBlockTypes = normalizeOptionalSet(skipBlockTypes);

    const blockIds = this.relatedBlockIdsByRelType(relType);
    // TODO: Directly support IBlockFilterOpts in getItemByBlockId maybe?
    let items = blockIds.map((blockId) => this.parentPage.getItemByBlockId(blockId));
    if (skipBlockTypes) items = items.filter((item) => !skipBlockTypes.has(item.blockType));
    if (includeBlockTypes) {
      items = items.filter((item) => {
        if (includeBlockTypes.has(item.blockType)) return true;
        if (!onUnexpectedBlockType) return false;
        // Otherwise need to take action on this unexpected block:
        const msg = `(While iterating ${relType} relations of parent ${this.id}) Found unexpected block ID ${item.id} of type ${item.blockType} not in set ${Array.from(includeBlockTypes)}`;
        if (onUnexpectedBlockType === "warn") {
          console.warn(msg);
          return false;
        } else {
          throw new Error(msg);
        }
      });
    }
    return items;
  }
}
