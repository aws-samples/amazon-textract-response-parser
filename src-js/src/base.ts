// Local Dependencies:
import { ApiDocumentMetadata } from "./api-models";

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
