/**
 * Common shared utilities, interfaces, etc.
 */

// Local Dependencies:
import { ApiBlock, ApiBlockType, ApiDocumentMetadata } from "./api-models";

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

  get dict(): T {
    return this._dict;
  }
}

/**
 * Base class for classes which wrap over a Textract API 'Block' object.
 */
export class ApiBlockWrapper<T extends ApiBlock> extends ApiObjectWrapper<T> {
  get id(): string {
    return this._dict.Id;
  }

  get blockType(): ApiBlockType {
    return this._dict.BlockType;
  }
}

export class DocumentMetadata extends ApiObjectWrapper<ApiDocumentMetadata> {
  get nPages(): number {
    return this._dict?.Pages || 0;
  }
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
 * Get the most common value in an Iterable of numbers
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
 * Interface for a (TextractDocument-like) object that can query Textract Blocks
 *
 * This is used to avoid circular references in child classes which need to reference some
 * TextractDocument-like parent, before the actual TextractDocument class is defined.
 */
export interface IDocBlocks {
  getBlockById: { (blockId: string): ApiBlock | undefined };
  listBlocks: { (): ApiBlock[] };
}

/**
 * Interface for a (Page-like) object that references a parent document
 *
 * This is used to avoid circular references in child classes which need to reference some
 * Page-like parent, before the actual Page class is defined.
 */
export interface WithParentDocBlocks {
  readonly parentDocument: IDocBlocks;
}
