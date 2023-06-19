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
 * @returns The most common value, or NaN if `arr` was empty.
 */
export function modalAvg(arr: Iterable<number>): number {
  const freqs: { [key: number]: { value: number; freq: number } } = {};
  for (const item of arr) {
    if (freqs[item]) {
      ++freqs[item].freq;
    } else {
      freqs[item] = { value: item, freq: 1 };
    }
  }

  let maxFreq = 0;
  let mode = NaN;
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
 * If `arr` is empty, this function will return `NaN` for most aggregations except: Max returns
 * `-Infinity`; Min returns `+Infinity`.
 */
export function aggregate(arr: Iterable<number>, aggMethod: AggregationMethod): number {
  if (aggMethod === AggregationMethod.GeometricMean) {
    const actualArr = Array.isArray(arr) ? arr : Array.from(arr);
    // Performing arithmetic mean in logspace better numerically conditioned than just multiplying:
    return Math.exp(actualArr.reduce((acc, next) => acc + Math.log(next), 0) / actualArr.length);
  } else if (aggMethod === AggregationMethod.Max) {
    return Math.max(...arr);
  } else if (aggMethod === AggregationMethod.Mean) {
    const actualArr = Array.isArray(arr) ? arr : Array.from(arr);
    return actualArr.reduce((acc, next) => acc + next, 0) / actualArr.length;
  } else if (aggMethod === AggregationMethod.Min) {
    return Math.min(...arr);
  } else if (aggMethod === AggregationMethod.Mode) {
    return modalAvg(arr);
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
    { maxValue: -Infinity, maxIndex: -1 }
  );
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
