import { ApiBlockType, ApiRelationshipType } from "../../src/api-models/base";
import {
  ApiLineBlock,
  ApiSelectionElementBlock,
  ApiSelectionStatus,
  ApiSignatureBlock,
  ApiTextType,
  ApiWordBlock,
} from "../../src/api-models/content";
import { ApiBlock } from "../../src/api-models/document";
import { IApiBlockWrapper, IBlockManager } from "../../src/base";
import { LineGeneric, SelectionElement, Signature, Word } from "../../src/content";

const EXAMPLE_WORD_BLOCK: ApiWordBlock = {
  BlockType: "WORD" as ApiBlockType.Word,
  Confidence: 99.9,
  Geometry: {
    BoundingBox: {
      Height: 0.055,
      Left: 0.297,
      Top: 0.04,
      Width: 0.177,
    },
    Polygon: [
      {
        X: 0.297,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.095,
      },
      {
        X: 0.297,
        Y: 0.095,
      },
    ],
  },
  Id: "8026a7ef-b929-4154-b805-1d21411b4863",
  Text: "Employment",
  TextType: "PRINTED" as ApiTextType,
};

const EXAMPLE_SELECT_BLOCK: ApiSelectionElementBlock = {
  BlockType: "SELECTION_ELEMENT" as ApiBlockType.SelectionElement,
  Confidence: 92,
  Geometry: {
    BoundingBox: {
      Height: 0.055,
      Left: 0.297,
      Top: 0.04,
      Width: 0.177,
    },
    Polygon: [
      {
        X: 0.297,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.095,
      },
      {
        X: 0.297,
        Y: 0.095,
      },
    ],
  },
  Id: "e6f55d8a-eaed-467d-9235-92d869bb71df",
  SelectionStatus: "SELECTED" as ApiSelectionStatus,
};

const EXAMPLE_SIG_BLOCK: ApiSignatureBlock = {
  BlockType: "SIGNATURE" as ApiBlockType.Signature,
  Confidence: 40.4,
  Geometry: {
    BoundingBox: {
      Width: 0.155,
      Height: 0.03,
      Left: 0.126,
      Top: 0.3,
    },
    Polygon: [
      {
        X: 0.126,
        Y: 0.3,
      },
      {
        X: 0.281,
        Y: 0.3,
      },
      {
        X: 0.281,
        Y: 0.33,
      },
      {
        X: 0.126,
        Y: 0.33,
      },
    ],
  },
  Id: "19baf15e-ab45-436c-af37-b930ef61e540",
};

const EXAMPLE_LINE_BLOCK: ApiLineBlock = {
  BlockType: "LINE" as ApiBlockType.Line,
  Confidence: 99.0,
  Geometry: {
    BoundingBox: {
      Height: 0.055,
      Left: 0.297,
      Top: 0.04,
      Width: 0.177,
    },
    Polygon: [
      {
        X: 0.297,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.095,
      },
      {
        X: 0.297,
        Y: 0.095,
      },
    ],
  },
  Id: "bd0b8aed-b700-49af-9b93-6dbce6e0777c",
  Text: "DIFFERENT FROM WORD TEXT",
  Relationships: [
    {
      Type: "CHILD" as ApiRelationshipType.Child,
      Ids: ["8026a7ef-b929-4154-b805-1d21411b4863"],
    },
  ],
};

/**
 * Mock for something Page-like (IBlockManager) to support unit testing
 */
class DummyPage implements IBlockManager {
  private _blocks: ApiBlock[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(blocks: ApiBlock[], items: any[] | undefined = undefined) {
    this._blocks = blocks;
    this._items = items || [];
  }

  get parentDocument() {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  getItemByBlockId(id: string): any {
    if (!this._items) {
      throw new Error("Dummy page requires items in constructor to use getItemByBlockId");
    }
    const result = this._items.find((item) => item.id === id);
    if (!result) {
      throw new Error(`Item ID ${id} missing from dummy page`);
    }
    return result;
  }

  getBlockById(id: string): ApiBlock | undefined {
    return this._blocks.find((block) => block.Id === id);
  }

  listBlocks(): ApiBlock[] {
    return this._blocks.slice();
  }

  registerParsedItem(blockId: string, item: IApiBlockWrapper<ApiBlock>): void {
    if (this._blocks.indexOf(item.dict) < 0) {
      this._blocks.push(item.dict);
      this._items.push(item);
    }
  }
}

describe("Word", () => {
  it("correctly stores raw dict properties", () => {
    const word = new Word(EXAMPLE_WORD_BLOCK);
    expect(word.blockType).toStrictEqual(ApiBlockType.Word);
    expect(word.confidence).toStrictEqual(EXAMPLE_WORD_BLOCK.Confidence);
    expect(word.dict).toBe(EXAMPLE_WORD_BLOCK);
    expect(word.geometry).toBeTruthy();
    expect(word.geometry.boundingBox).toBeTruthy();
    expect(word.geometry.boundingBox.top).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Top);
    expect(word.geometry.boundingBox.left).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Left);
    expect(word.geometry.boundingBox.height).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Height);
    expect(word.geometry.boundingBox.width).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Width);
    expect(word.geometry.polygon).toBeTruthy();
    expect(word.geometry.polygon.length).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon.length);
    EXAMPLE_WORD_BLOCK.Geometry.Polygon.forEach((rawPoly, ixPoint) => {
      expect(word.geometry.polygon[ixPoint].x).toStrictEqual(rawPoly.X);
      expect(word.geometry.polygon[ixPoint].y).toStrictEqual(rawPoly.Y);
    });
    expect(word.id).toStrictEqual(EXAMPLE_WORD_BLOCK.Id);
    expect(word.text).toStrictEqual(EXAMPLE_WORD_BLOCK.Text);
    expect(word.textType).toStrictEqual(EXAMPLE_WORD_BLOCK.TextType);
  });

  it("renders plain word text for str", () => {
    const word = new Word(EXAMPLE_WORD_BLOCK);
    expect(word.str()).toStrictEqual(word.text);
  });

  it("propagates confidence updates to underlying dict", () => {
    const wordBlockCopy: ApiWordBlock = JSON.parse(JSON.stringify(EXAMPLE_WORD_BLOCK));
    const word = new Word(wordBlockCopy);
    word.confidence = 13.4;
    expect(word.confidence).toStrictEqual(13.4);
    expect(wordBlockCopy.Confidence).toStrictEqual(13.4);
  });

  it("propagates textType updates to underlying dict", () => {
    const wordBlockCopy: ApiWordBlock = JSON.parse(JSON.stringify(EXAMPLE_WORD_BLOCK));
    const word = new Word(wordBlockCopy);
    word.textType = ApiTextType.Handwriting;
    expect(word.textType).toStrictEqual(ApiTextType.Handwriting);
    expect(wordBlockCopy.TextType).toStrictEqual(ApiTextType.Handwriting);
  });
});

describe("SelectionElement", () => {
  it("correctly stores raw dict properties", () => {
    const selEl = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    expect(selEl.blockType).toStrictEqual(ApiBlockType.SelectionElement);
    expect(selEl.confidence).toStrictEqual(EXAMPLE_SELECT_BLOCK.Confidence);
    expect(selEl.dict).toBe(EXAMPLE_SELECT_BLOCK);
    expect(selEl.geometry).toBeTruthy();
    expect(selEl.geometry.boundingBox).toBeTruthy();
    expect(selEl.geometry.boundingBox.top).toStrictEqual(EXAMPLE_SELECT_BLOCK.Geometry.BoundingBox.Top);
    expect(selEl.geometry.boundingBox.left).toStrictEqual(EXAMPLE_SELECT_BLOCK.Geometry.BoundingBox.Left);
    expect(selEl.geometry.boundingBox.height).toStrictEqual(EXAMPLE_SELECT_BLOCK.Geometry.BoundingBox.Height);
    expect(selEl.geometry.boundingBox.width).toStrictEqual(EXAMPLE_SELECT_BLOCK.Geometry.BoundingBox.Width);
    expect(selEl.geometry.polygon).toBeTruthy();
    expect(selEl.geometry.polygon.length).toStrictEqual(EXAMPLE_SELECT_BLOCK.Geometry.Polygon.length);
    EXAMPLE_SELECT_BLOCK.Geometry.Polygon.forEach((rawPoly, ixPoint) => {
      expect(selEl.geometry.polygon[ixPoint].x).toStrictEqual(rawPoly.X);
      expect(selEl.geometry.polygon[ixPoint].y).toStrictEqual(rawPoly.Y);
    });
    expect(selEl.id).toStrictEqual(EXAMPLE_SELECT_BLOCK.Id);
    expect(selEl.selectionStatus).toStrictEqual(EXAMPLE_SELECT_BLOCK.SelectionStatus);
    expect(selEl.text).toStrictEqual(EXAMPLE_SELECT_BLOCK.SelectionStatus);
  });

  it("uses selection status for str()", () => {
    const selEl = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    expect(selEl.str()).toStrictEqual(ApiSelectionStatus.Selected);
  });

  it("propagates confidence updates to underlying dict", () => {
    const selBlockCopy: ApiSelectionElementBlock = JSON.parse(JSON.stringify(EXAMPLE_SELECT_BLOCK));
    const selEl = new SelectionElement(selBlockCopy);
    selEl.confidence = 13;
    expect(selEl.confidence).toStrictEqual(13);
    expect(selBlockCopy.Confidence).toStrictEqual(13);
  });

  it("propagates selectionStatus updates to underlying dict", () => {
    const selBlockCopy: ApiSelectionElementBlock = JSON.parse(JSON.stringify(EXAMPLE_SELECT_BLOCK));
    const selEl = new SelectionElement(selBlockCopy);
    selEl.selectionStatus = ApiSelectionStatus.NotSelected;
    expect(selEl.selectionStatus).toStrictEqual(ApiSelectionStatus.NotSelected);
    expect(selBlockCopy.SelectionStatus).toStrictEqual(ApiSelectionStatus.NotSelected);
  });
});

describe("Signature", () => {
  it("correctly stores raw dict properties", () => {
    const sigEl = new Signature(EXAMPLE_SIG_BLOCK);
    expect(sigEl.blockType).toStrictEqual(ApiBlockType.Signature);
    expect(sigEl.confidence).toStrictEqual(EXAMPLE_SIG_BLOCK.Confidence);
    expect(sigEl.dict).toBe(EXAMPLE_SIG_BLOCK);
    expect(sigEl.geometry).toBeTruthy();
    expect(sigEl.geometry.boundingBox).toBeTruthy();
    expect(sigEl.geometry.boundingBox.top).toStrictEqual(EXAMPLE_SIG_BLOCK.Geometry.BoundingBox.Top);
    expect(sigEl.geometry.boundingBox.left).toStrictEqual(EXAMPLE_SIG_BLOCK.Geometry.BoundingBox.Left);
    expect(sigEl.geometry.boundingBox.height).toStrictEqual(EXAMPLE_SIG_BLOCK.Geometry.BoundingBox.Height);
    expect(sigEl.geometry.boundingBox.width).toStrictEqual(EXAMPLE_SIG_BLOCK.Geometry.BoundingBox.Width);
    expect(sigEl.geometry.polygon).toBeTruthy();
    expect(sigEl.geometry.polygon.length).toStrictEqual(EXAMPLE_SIG_BLOCK.Geometry.Polygon.length);
    EXAMPLE_SIG_BLOCK.Geometry.Polygon.forEach((rawPoly, ixPoint) => {
      expect(sigEl.geometry.polygon[ixPoint].x).toStrictEqual(rawPoly.X);
      expect(sigEl.geometry.polygon[ixPoint].y).toStrictEqual(rawPoly.Y);
    });
    expect(sigEl.id).toStrictEqual(EXAMPLE_SIG_BLOCK.Id);
  });

  it("reports empty text", () => {
    const sigEl = new Signature(EXAMPLE_SIG_BLOCK);
    expect(sigEl.text).toStrictEqual("");
  });

  it("renders an informational str() representation", () => {
    const sigEl = new Signature(EXAMPLE_SIG_BLOCK);
    expect(sigEl.str()).toStrictEqual("/-------------\\\n| [SIGNATURE] |\n\\-------------/");
  });

  it("propagates confidence updates to underlying dict", () => {
    const sigBlockCopy: ApiSignatureBlock = JSON.parse(JSON.stringify(EXAMPLE_SIG_BLOCK));
    const sigEl = new Signature(sigBlockCopy);
    sigEl.confidence = 13;
    expect(sigEl.confidence).toStrictEqual(13);
    expect(sigBlockCopy.Confidence).toStrictEqual(13);
  });
});

describe("LineGeneric", () => {
  it("correctly stores raw dict properties", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummyPage = new DummyPage([EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK], [dummyWord]);
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(line.blockType).toStrictEqual(ApiBlockType.Line);
    expect(line.confidence).toStrictEqual(EXAMPLE_LINE_BLOCK.Confidence);
    expect(line.dict).toBe(EXAMPLE_LINE_BLOCK);
    expect(line.geometry).toBeTruthy();
    expect(line.geometry.boundingBox).toBeTruthy();
    expect(line.geometry.boundingBox.top).toStrictEqual(EXAMPLE_LINE_BLOCK.Geometry.BoundingBox.Top);
    expect(line.geometry.boundingBox.left).toStrictEqual(EXAMPLE_LINE_BLOCK.Geometry.BoundingBox.Left);
    expect(line.geometry.boundingBox.height).toStrictEqual(EXAMPLE_LINE_BLOCK.Geometry.BoundingBox.Height);
    expect(line.geometry.boundingBox.width).toStrictEqual(EXAMPLE_LINE_BLOCK.Geometry.BoundingBox.Width);
    expect(line.geometry.polygon).toBeTruthy();
    expect(line.geometry.polygon.length).toStrictEqual(EXAMPLE_LINE_BLOCK.Geometry.Polygon.length);
    EXAMPLE_LINE_BLOCK.Geometry.Polygon.forEach((rawPoly, ixPoint) => {
      expect(line.geometry.polygon[ixPoint].x).toStrictEqual(rawPoly.X);
      expect(line.geometry.polygon[ixPoint].y).toStrictEqual(rawPoly.Y);
    });
    expect(line.id).toStrictEqual(EXAMPLE_LINE_BLOCK.Id);
    expect(line.nWords).toStrictEqual(1);
    expect(line.parentPage).toBe(dummyPage);
    expect(line.text).toStrictEqual(EXAMPLE_LINE_BLOCK.Text);
  });

  it("renders debug info for str()", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummyPage = new DummyPage([EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK], [dummyWord]);
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    const strRep = line.str();
    expect(strRep.startsWith("Line\n==========\n")).toBeTruthy();
    expect(strRep).toContain(
      line
        .listWords()
        .map((word) => word.text)
        .join(" ")
    );
  });

  it("throws error when accessing a missing WORD child)", () => {
    const lineBlockCopy: ApiLineBlock = JSON.parse(JSON.stringify(EXAMPLE_LINE_BLOCK));
    lineBlockCopy.Relationships[0].Ids.push("DOESNOTEXIST");
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummyPage = new DummyPage([lineBlockCopy, EXAMPLE_WORD_BLOCK], [dummyWord]);
    const line = new LineGeneric(lineBlockCopy, dummyPage);
    expect(warn).toHaveBeenCalledTimes(0);
    warn.mockReset();
    expect(() => line.listWords()).toThrow("missing");
  });

  it("propagates confidence updates to underlying dict", () => {
    const lineBlockCopy: ApiLineBlock = JSON.parse(JSON.stringify(EXAMPLE_LINE_BLOCK));
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummyPage = new DummyPage([lineBlockCopy, EXAMPLE_WORD_BLOCK], [dummyWord]);
    const line = new LineGeneric(lineBlockCopy, dummyPage);
    line.confidence = 13.4;
    expect(line.confidence).toStrictEqual(13.4);
    expect(lineBlockCopy.Confidence).toStrictEqual(13.4);
  });
});

/**
 * The mixins are tricky to test alone, so we use LineGeneric for WithWords, tables for WithContent
 */
describe("WithWords (via LineGeneric)", () => {
  it("iterates, lists, and counts contained Words", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummyPage = new DummyPage([EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK], [dummyWord]);
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    const wordList = line.listWords();
    let nWords = 0;
    for (const word of line.iterWords()) {
      expect(word).toBe(wordList[nWords]);
      ++nWords;
    }
    expect(nWords).toStrictEqual(line.nWords);
    expect(nWords).toStrictEqual(wordList.length);
  });

  it("gracefully interprets missing LINE.Relationships field as an empty set", () => {
    const lineBlockCopy: ApiLineBlock = {
      ...JSON.parse(JSON.stringify(EXAMPLE_LINE_BLOCK)),
      Relationships: undefined,
    };
    const dummyPage = new DummyPage([lineBlockCopy], []);
    const line = new LineGeneric(lineBlockCopy, dummyPage);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    expect(() => line.listWords()).not.toThrow();
    expect(line.listWords().length).toStrictEqual(0);
    expect(warn).toHaveBeenCalledTimes(2); // Warn on each attempt to access
    warn.mockReset();
  });
});
