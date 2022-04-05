/**
 * TRP classes for (generic document) low-level content objects
 */

// Local Dependencies:
import {
  ApiBlockType,
  ApiLineBlock,
  ApiRelationshipType,
  ApiSelectionElementBlock,
  ApiSelectionStatus,
  ApiTextType,
  ApiWordBlock,
} from "./api-models/document";
import { ApiBlockWrapper, getIterable, WithParentDocBlocks } from "./base";
import { Geometry } from "./geometry";

// Simple constructor type for TS mixin pattern
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T;

export class Word extends ApiBlockWrapper<ApiWordBlock> {
  _geometry: Geometry<ApiWordBlock, Word>;

  constructor(block: ApiWordBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiWordBlock, Word> {
    return this._geometry;
  }
  get text(): string {
    return this._dict.Text;
  }
  get textType(): ApiTextType {
    return this._dict.TextType;
  }
  set textType(newVal: ApiTextType) {
    this._dict.TextType = newVal;
  }

  str(): string {
    return this.text;
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function WithWords<T extends Constructor<{}>>(SuperClass: T) {
  return class extends SuperClass {
    _words: Word[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      this._words = [];
    }

    get nWords(): number {
      return this._words.length;
    }

    /**
     * Iterate through the Words in this object
     * @example
     * for (const word of line.iterWords) {
     *   console.log(word.text);
     * }
     * @example
     * [...line.iterWords()].forEach(
     *   (word) => console.log(word.text)
     * );
     */
    iterWords(): Iterable<Word> {
      return getIterable(() => this._words);
    }

    listWords(): Word[] {
      return this._words.slice();
    }

    /**
     * Get a particular Word from the object by index
     * @param ix 0-based index in the word list
     * @throws if the index is out of bounds
     */
    wordAtIndex(ix: number): Word {
      if (ix < 0 || ix >= this._words.length) {
        throw new Error(`Word index ${ix} must be >=0 and <${this._words.length}`);
      }
      return this._words[ix];
    }
  };
}

/**
 * Generic base class for a Line, as the parent Page is not defined here.
 *
 * If you're consuming this library, you probably just want to use `document.ts/Line`.
 */
export class LineGeneric<TPage extends WithParentDocBlocks> extends WithWords(ApiBlockWrapper)<ApiLineBlock> {
  _geometry: Geometry<ApiLineBlock, LineGeneric<TPage>>;
  _parentPage: TPage;

  constructor(block: ApiLineBlock, parentPage: TPage) {
    super(block);
    this._parentPage = parentPage;
    this._words = [];
    this._geometry = new Geometry(block.Geometry, this);
    const parentDocument = parentPage.parentDocument;
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            const wordBlock = parentDocument.getBlockById(cid);
            if (!wordBlock) {
              console.warn(`Document missing word block ${cid} referenced by line ${this.id}`);
              return;
            }
            if (wordBlock.BlockType == ApiBlockType.Word)
              this._words.push(new Word(wordBlock as ApiWordBlock));
          });
        }
      });
    }
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiLineBlock, LineGeneric<TPage>> {
    return this._geometry;
  }
  get parentPage(): TPage {
    return this._parentPage;
  }
  get text(): string {
    return this._dict.Text;
  }

  str(): string {
    return `Line\n==========\n${this._dict.Text}\nWords\n----------\n${this._words
      .map((word) => `[${word.str()}]`)
      .join("")}`;
  }
}

export class SelectionElement extends ApiBlockWrapper<ApiSelectionElementBlock> {
  _geometry: Geometry<ApiSelectionElementBlock, SelectionElement>;

  constructor(block: ApiSelectionElementBlock) {
    super(block);
    this._geometry = new Geometry(block.Geometry, this);
  }

  get confidence(): number {
    return this._dict.Confidence;
  }
  set confidence(newVal: number) {
    this._dict.Confidence = newVal;
  }
  get geometry(): Geometry<ApiSelectionElementBlock, SelectionElement> {
    return this._geometry;
  }
  get selectionStatus(): ApiSelectionStatus {
    return this._dict.SelectionStatus;
  }
  set selectionStatus(newVal: ApiSelectionStatus) {
    this._dict.SelectionStatus = newVal;
  }
}
