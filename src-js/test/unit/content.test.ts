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
import { IApiBlockWrapper, IBlockManager, PageHostedApiBlockWrapper } from "../../src/base";
import {
  LineGeneric,
  SelectionElement,
  Signature,
  WithWords,
  Word,
  buildWithContent,
} from "../../src/content";

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
      Ids: [
        "8026a7ef-b929-4154-b805-1d21411b4863", // EXAMPLE_WORD_BLOCK
        "e6f55d8a-eaed-467d-9235-92d869bb71df", // EXAMPLE_SELECT_BLOCK
      ],
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  it("renders plain word text for HTML and str", () => {
    const word = new Word(EXAMPLE_WORD_BLOCK);
    expect(word.html()).toStrictEqual(word.text);
    expect(word.str()).toStrictEqual(word.text);
  });

  it("filters HTML rendering by block type", () => {
    const word = new Word(EXAMPLE_WORD_BLOCK);
    expect(word.html({ includeBlockTypes: [ApiBlockType.Word] })).toStrictEqual(word.text);
    expect(word.html({ includeBlockTypes: [ApiBlockType.Line] })).toStrictEqual("");
    expect(word.html({ skipBlockTypes: [ApiBlockType.Word] })).toStrictEqual("");
    expect(word.html({ skipBlockTypes: [ApiBlockType.Line] })).toStrictEqual(word.text);
  });

  it("escapes forbidden entities in word text for html()", () => {
    const customBlock = JSON.parse(JSON.stringify(EXAMPLE_WORD_BLOCK));
    const word = new Word(customBlock);
    customBlock.Text = `Text-with-<html>-&-'quote-marks"`;
    const customHtml = word.html();
    expect(customHtml).toContain("&lt;");
    expect(customHtml).toContain("&gt;");
    expect(customHtml).not.toContain("<html>");
    expect(customHtml).toContain("-&amp;-");
    expect(customHtml).not.toContain("-&-");
    expect(customHtml).toContain(`'quote-marks"`);
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

  it("renders semantic HTML", () => {
    const selEl = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    expect(selEl.html()).toStrictEqual('<input type="checkbox" disabled checked />');
    const selBlockCopy: ApiSelectionElementBlock = JSON.parse(JSON.stringify(EXAMPLE_SELECT_BLOCK));
    selBlockCopy.SelectionStatus = ApiSelectionStatus.NotSelected;
    const unselEl = new SelectionElement(selBlockCopy);
    expect(unselEl.html()).toStrictEqual('<input type="checkbox" disabled />');
  });

  it("filters HTML rendering by block type", () => {
    const selEl = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const elHtml = '<input type="checkbox" disabled checked />';
    expect(selEl.html({ includeBlockTypes: [ApiBlockType.SelectionElement] })).toStrictEqual(elHtml);
    expect(selEl.html({ includeBlockTypes: [ApiBlockType.Word] })).toStrictEqual("");
    expect(selEl.html({ skipBlockTypes: [ApiBlockType.SelectionElement] })).toStrictEqual("");
    expect(selEl.html({ skipBlockTypes: [ApiBlockType.Word] })).toStrictEqual(elHtml);
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

  it("renders semantic HTML", () => {
    const sigEl = new Signature(EXAMPLE_SIG_BLOCK);
    expect(sigEl.html()).toStrictEqual('<input class="signature" type="text" disabled value="[SIGNATURE]"/>');
  });

  it("filters HTML rendering by block type", () => {
    const sigEl = new Signature(EXAMPLE_SIG_BLOCK);
    const elHtml = '<input class="signature" type="text" disabled value="[SIGNATURE]"/>';
    expect(sigEl.html({ includeBlockTypes: [ApiBlockType.Signature] })).toStrictEqual(elHtml);
    expect(sigEl.html({ includeBlockTypes: [ApiBlockType.Word] })).toStrictEqual("");
    expect(sigEl.html({ skipBlockTypes: [ApiBlockType.Signature] })).toStrictEqual("");
    expect(sigEl.html({ skipBlockTypes: [ApiBlockType.Word] })).toStrictEqual(elHtml);
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
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
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

  it("renders plain line text for HTML", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(line.html()).toStrictEqual(line.text);
  });

  it("filters getText by content types (including own block)", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(line.nWords).toBeGreaterThan(0);
    expect(line.getText({ skipBlockTypes: [ApiBlockType.Line] })).toStrictEqual("");
    expect(line.getText({ skipBlockTypes: [ApiBlockType.Word] })).toStrictEqual(line.dict.Text);
    expect(line.getText({ skipBlockTypes: [ApiBlockType.SelectionElement] })).toStrictEqual(line.dict.Text);
    expect(line.getText({ includeBlockTypes: [ApiBlockType.Line] })).toStrictEqual(line.dict.Text);
    expect(line.getText({ includeBlockTypes: [ApiBlockType.Word] })).toStrictEqual("");
    expect(line.getText({ includeBlockTypes: [ApiBlockType.Line, ApiBlockType.Word] })).toStrictEqual(
      line.dict.Text,
    );

    // Because LineGeneric.getText does not actually iterate children, errors and warnings don't get generated:
    expect(warn).toHaveBeenCalledTimes(0);
    expect(() => line.getText({ onUnexpectedBlockType: "error", skipBlockTypes: [] })).not.toThrow();
    expect(line.getText({ onUnexpectedBlockType: "warn" })).toStrictEqual(line.dict.Text);
    expect(warn).toHaveBeenCalledTimes(0);
    warn.mockReset();
  });

  it("filters HTML rendering by block type", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(line.html({ includeBlockTypes: [ApiBlockType.Line] })).toStrictEqual(line.text);
    expect(line.html({ includeBlockTypes: [ApiBlockType.Signature] })).toStrictEqual("");
    expect(line.html({ skipBlockTypes: [ApiBlockType.Line] })).toStrictEqual("");
    expect(line.html({ skipBlockTypes: [ApiBlockType.SelectionElement] })).toStrictEqual(line.text);
    expect(line.html({ skipBlockTypes: [ApiBlockType.Word] })).toStrictEqual(line.text);
  });

  it("escapes forbidden entities in line text for html()", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const customBlock = JSON.parse(JSON.stringify(EXAMPLE_WORD_BLOCK));
    const line = new LineGeneric(customBlock, dummyPage);
    customBlock.Text = `Text-with-<html>-&-'quote-marks"`;
    const customHtml = line.html();
    expect(customHtml).toContain("&lt;");
    expect(customHtml).toContain("&gt;");
    expect(customHtml).not.toContain("<html>");
    expect(customHtml).toContain("-&amp;-");
    expect(customHtml).not.toContain("-&-");
    expect(customHtml).toContain(`'quote-marks"`);
  });

  it("renders debug info for str()", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    const strRep = line.str();
    expect(strRep.startsWith("Line\n==========\n")).toBeTruthy();
    expect(strRep).toContain(
      line
        .listWords()
        .map((word) => word.text)
        .join(" "),
    );
  });

  it("throws error when accessing a missing WORD child)", () => {
    const lineBlockCopy: ApiLineBlock = JSON.parse(JSON.stringify(EXAMPLE_LINE_BLOCK));
    lineBlockCopy.Relationships[0].Ids.push("DOESNOTEXIST");
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [lineBlockCopy, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const line = new LineGeneric(lineBlockCopy, dummyPage);
    expect(warn).toHaveBeenCalledTimes(0);
    warn.mockReset();
    expect(() => line.listWords()).toThrow("DOESNOTEXIST");
  });

  it("propagates confidence updates to underlying dict", () => {
    const lineBlockCopy: ApiLineBlock = JSON.parse(JSON.stringify(EXAMPLE_LINE_BLOCK));
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [lineBlockCopy, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const line = new LineGeneric(lineBlockCopy, dummyPage);
    line.confidence = 13.4;
    expect(line.confidence).toStrictEqual(13.4);
    expect(lineBlockCopy.Confidence).toStrictEqual(13.4);
  });
});

/**
 * The mixins are tricky to test alone, so we use LineGeneric as a base
 */
describe("WithWords (via LineGeneric)", () => {
  it("iterates, lists, and counts contained Words", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_SELECT_BLOCK, EXAMPLE_WORD_BLOCK],
      [dummyWord, dummySel],
    );
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
    expect(warn).toHaveBeenCalledTimes(0); // No warnings with default settings
    warn.mockReset();
  });

  it("filters specific content block types configured at runtime", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(line.nWords).toBeGreaterThan(0);
    expect(line.listWords({ includeBlockTypes: [ApiBlockType.Signature] }).length).toStrictEqual(0);
    expect([...line.iterWords({ includeBlockTypes: [ApiBlockType.Signature] })].length).toStrictEqual(0);
    const wordList = line.listWords({ includeBlockTypes: [ApiBlockType.Word] });
    expect(wordList.length).toStrictEqual(1);
    expect(wordList[0]).toBe(dummyWord);
    const iterWords = [...line.iterWords({ includeBlockTypes: [ApiBlockType.Word] })];
    expect(iterWords.length).toStrictEqual(1);
    expect(iterWords[0]).toBe(dummyWord);
    expect(warn).toHaveBeenCalledTimes(0);
    warn.mockReset();
  });

  it("skips specific content block types configured at runtime", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(line.listWords({ skipBlockTypes: [ApiBlockType.Word] }).length).toStrictEqual(0);
    expect([...line.iterWords({ skipBlockTypes: [ApiBlockType.Word] })].length).toStrictEqual(0);
    const wordList = line.listWords({ skipBlockTypes: [ApiBlockType.Line] });
    expect(wordList.length).toStrictEqual(1);
    expect(wordList[0]).toBe(dummyWord);
    expect(warn).toHaveBeenCalledTimes(0);
    const iterWords = [
      ...line.iterWords({ onUnexpectedBlockType: "warn", skipBlockTypes: [ApiBlockType.Line] }),
    ];
    expect(iterWords.length).toStrictEqual(1);
    expect(iterWords[0]).toBe(dummyWord);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockReset();
  });

  it("cannot request runtime blocks outside the mixin-configured scope", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    const itemList = line.listWords({
      includeBlockTypes: [ApiBlockType.SelectionElement, ApiBlockType.Word],
    });
    expect(itemList.length).toStrictEqual(1);
    expect(itemList[0]).toBe(dummyWord);
    const iterItems = [
      ...line.iterWords({ includeBlockTypes: [ApiBlockType.SelectionElement, ApiBlockType.Word] }),
    ];
    expect(iterItems.length).toStrictEqual(1);
    expect(iterItems[0]).toBe(dummyWord);
  });

  it("cannot prevent ignoring mixin-configured skip block types at runtime", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );

    class ErrLine extends WithWords(PageHostedApiBlockWrapper, {
      onUnexpectedBlockType: "error",
      otherExpectedChildTypes: [ApiBlockType.SelectionElement],
    })<ApiLineBlock, DummyPage> {}
    const line = new ErrLine(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(() => line.listWords({ skipBlockTypes: [] })).not.toThrow();
    expect(() => [...line.iterWords({ skipBlockTypes: [] })]).not.toThrow();
  });

  it("can override mixin-configured unexpected block handling at run-time", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const line = new LineGeneric(EXAMPLE_LINE_BLOCK, dummyPage);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    expect(() => line.listWords()).not.toThrow();
    expect(() => line.listWords({ onUnexpectedBlockType: "error" })).toThrow(/SELECTION_ELEMENT/);
    expect(() => [...line.iterWords({ onUnexpectedBlockType: "error" })]).toThrow(/SELECTION_ELEMENT/);
    expect(warn).toHaveBeenCalledTimes(0);
    expect(line.listWords({ onUnexpectedBlockType: "warn" }).length).toStrictEqual(1);
    expect([...line.iterWords({ onUnexpectedBlockType: "warn" })].length).toStrictEqual(1);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockReset();
  });

  it("filters getText by content types (including own block)", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    // LineGeneric has specific getText behaviour, so we'll explicitly test the Mixin:
    // class ErrLine extends WithWords(PageHostedApiBlockWrapper, { onUnexpectedBlockType: "error", otherExpectedChildTypes: [ApiBlockType.SelectionElement] })<ApiLineBlock, DummyPage> {}

    class ItemWithWords extends WithWords(PageHostedApiBlockWrapper)<ApiLineBlock, DummyPage> {}
    const itemWithWords = new ItemWithWords(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(itemWithWords.nWords).toBeGreaterThan(0);
    expect(itemWithWords.getText({ skipBlockTypes: [ApiBlockType.Line] })).toStrictEqual("");
    expect(itemWithWords.getText({ skipBlockTypes: [ApiBlockType.Word] })).toStrictEqual("");
    expect(itemWithWords.getText({ skipBlockTypes: [ApiBlockType.SelectionElement] })).toStrictEqual(
      itemWithWords.text,
    );
    expect(itemWithWords.getText({ includeBlockTypes: [ApiBlockType.Line] })).toStrictEqual("");
    expect(itemWithWords.getText({ includeBlockTypes: [ApiBlockType.Word] })).toStrictEqual("");
    expect(
      itemWithWords.getText({ includeBlockTypes: [ApiBlockType.Line, ApiBlockType.Word] }),
    ).toStrictEqual(itemWithWords.text);

    expect(warn).toHaveBeenCalledTimes(0);
    expect(() => itemWithWords.getText({ onUnexpectedBlockType: "error", skipBlockTypes: [] })).toThrow();
    expect(() =>
      itemWithWords.getText({
        onUnexpectedBlockType: "error",
        skipBlockTypes: [ApiBlockType.SelectionElement],
      }),
    ).not.toThrow();
    expect(itemWithWords.getText({ onUnexpectedBlockType: "warn" })).toStrictEqual(itemWithWords.text);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockReset();
  });
});

describe("WithContent (via LineGeneric)", () => {
  it("iterates, lists, and counts contained content Words and SelectionElements by default", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithDefaultContent = buildWithContent<SelectionElement | Signature | Word>()(LineGeneric);
    const line = new LineWithDefaultContent(EXAMPLE_LINE_BLOCK, dummyPage);
    const itemList = line.listContent();
    let nItems = 0;
    for (const item of line.iterContent()) {
      expect(item).toBe(itemList[nItems]);
      ++nItems;
    }
    expect(nItems).toStrictEqual(line.nContentItems);
    expect(nItems).toStrictEqual(itemList.length);
    expect(nItems).toStrictEqual(2);
  });

  it("can be explicitly instantiated with no content types, if you insist", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    // Setting `[]` should do this:
    const LineWithNoContent = buildWithContent<never>({ contentTypes: [] })(LineGeneric);
    const emptyLine = new LineWithNoContent(EXAMPLE_LINE_BLOCK, dummyPage);
    const emptyItemList = emptyLine.listContent();
    expect(emptyItemList.length).toStrictEqual(0);
    expect([...emptyLine.iterContent()].length).toStrictEqual(0);

    // ...But `undefined` should just return default content:
    const LineWithDefaultContent = buildWithContent<SelectionElement | Signature | Word>({
      contentTypes: undefined,
    })(LineGeneric);
    const line = new LineWithDefaultContent(EXAMPLE_LINE_BLOCK, dummyPage);
    const itemList = line.listContent();
    expect(itemList.length).toStrictEqual(2);
    expect([...line.iterContent()].length).toStrictEqual(2);
  });

  it("filters specific content block types configured by Mixin", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<Word>({
      contentTypes: [ApiBlockType.Word],
    })(LineGeneric);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    const itemList = line.listContent();
    expect(itemList.length).toStrictEqual(1);
    expect(itemList[0].dict).toBe(EXAMPLE_WORD_BLOCK);
    let nItems = 0;
    for (const item of line.iterContent()) {
      expect(item).toBe(itemList[nItems]);
      ++nItems;
    }
    expect(nItems).toStrictEqual(line.nContentItems);
    expect(nItems).toStrictEqual(itemList.length);
    expect(warn).toHaveBeenCalledTimes(0);
    warn.mockReset();
  });

  it("warns on unexpected content types if configured by Mixin", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<SelectionElement>({
      contentTypes: [ApiBlockType.SelectionElement],
      onUnexpectedBlockType: "warn",
    })(LineGeneric);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(warn).toHaveBeenCalledTimes(0);
    const itemList = line.listContent();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockClear();
    expect(itemList.length).toStrictEqual(1);
    expect(itemList[0].dict).toBe(EXAMPLE_SELECT_BLOCK);
    let nItems = 0;
    for (const item of line.iterContent()) {
      expect(item).toBe(itemList[nItems]);
      ++nItems;
    }
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockClear();
    expect(nItems).toStrictEqual(line.nContentItems);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(nItems).toStrictEqual(itemList.length);
    warn.mockReset();
  });

  it("suppresses warnings for known other block types configured by Mixin", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<SelectionElement>({
      contentTypes: [ApiBlockType.SelectionElement],
      onUnexpectedBlockType: "warn",
      otherExpectedChildTypes: [ApiBlockType.Word],
    })(LineGeneric);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(warn).toHaveBeenCalledTimes(0);
    const itemList = line.listContent();
    expect(warn).toHaveBeenCalledTimes(0);
    expect(itemList.length).toStrictEqual(1);
    expect(itemList[0].dict).toBe(EXAMPLE_SELECT_BLOCK);
    let nItems = 0;
    for (const item of line.iterContent()) {
      expect(item).toBe(itemList[nItems]);
      ++nItems;
    }
    expect(warn).toHaveBeenCalledTimes(0);
    expect(nItems).toStrictEqual(line.nContentItems);
    expect(warn).toHaveBeenCalledTimes(0);
    expect(nItems).toStrictEqual(itemList.length);
    warn.mockReset();
  });

  it("errors on unexpected content types if configured by Mixin", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<Word>({
      contentTypes: [ApiBlockType.Word],
      onUnexpectedBlockType: "error",
    })(LineGeneric);
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(() => line.listContent()).toThrow(/SELECTION_ELEMENT/);
  });

  it("suppresses errors on other content types if configured by Mixin", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<Word>({
      contentTypes: [ApiBlockType.Word],
      onUnexpectedBlockType: "error",
      otherExpectedChildTypes: [ApiBlockType.SelectionElement],
    })(LineGeneric);
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(() => line.listContent()).not.toThrow();
  });

  it("filters specific content block types configured at runtime", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<SelectionElement | Signature | Word>()(LineGeneric);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    const itemList = line.listContent({ includeBlockTypes: [ApiBlockType.SelectionElement] });
    expect(itemList.length).toStrictEqual(1);
    expect(itemList[0].dict).toBe(EXAMPLE_SELECT_BLOCK);
    let nItems = 0;
    for (const item of line.iterContent({ includeBlockTypes: [ApiBlockType.SelectionElement] })) {
      expect(item).toBe(itemList[nItems]);
      ++nItems;
    }
    expect(nItems).toBeLessThan(line.nContentItems);
    expect(nItems).toStrictEqual(itemList.length);
    expect(warn).toHaveBeenCalledTimes(0);
    warn.mockReset();
  });

  it("skips specific content block types configured at runtime", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<SelectionElement | Signature | Word>()(LineGeneric);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    const itemList = line.listContent({ skipBlockTypes: [ApiBlockType.SelectionElement] });
    expect(itemList.length).toStrictEqual(1);
    expect(itemList[0].dict).toBe(EXAMPLE_WORD_BLOCK);
    let nItems = 0;
    for (const item of line.iterContent({ skipBlockTypes: [ApiBlockType.SelectionElement] })) {
      expect(item).toBe(itemList[nItems]);
      ++nItems;
    }
    expect(nItems).toBeLessThan(line.nContentItems);
    expect(nItems).toStrictEqual(itemList.length);
    expect(warn).toHaveBeenCalledTimes(0);
    warn.mockReset();
  });

  it("cannot request runtime blocks outside the mixin-configured scope", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<Word>({ contentTypes: [ApiBlockType.Word] })(LineGeneric);
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    const itemList = line.listContent({ includeBlockTypes: [ApiBlockType.SelectionElement] });
    expect(itemList.length).toStrictEqual(0);
    expect(
      [...line.iterContent({ includeBlockTypes: [ApiBlockType.SelectionElement] })].length,
    ).toStrictEqual(0);
  });

  it("cannot prevent ignoring mixin-configured skip block types at runtime", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<Word>({
      contentTypes: [ApiBlockType.Word],
      onUnexpectedBlockType: "error",
      otherExpectedChildTypes: [ApiBlockType.SelectionElement],
    })(LineGeneric);
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(() => line.listContent({ skipBlockTypes: [] })).not.toThrow();
    expect(() => [...line.iterContent({ skipBlockTypes: [] })]).not.toThrow();
  });

  it("can override mixin-configured unexpected block handling at run-time", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const LineWithContent = buildWithContent<Word>({
      contentTypes: [ApiBlockType.Word],
    })(LineGeneric);
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(() => line.listContent()).not.toThrow();
    expect(() => line.listContent({ onUnexpectedBlockType: "error" })).toThrow(/SELECTION_ELEMENT/);
    expect(() => [...line.iterContent({ onUnexpectedBlockType: "error" })]).toThrow(/SELECTION_ELEMENT/);
  });

  it("filters getText by content types (including own block)", () => {
    const dummyWord = new Word(EXAMPLE_WORD_BLOCK);
    const dummySel = new SelectionElement(EXAMPLE_SELECT_BLOCK);
    const dummyPage = new DummyPage(
      [EXAMPLE_LINE_BLOCK, EXAMPLE_WORD_BLOCK, EXAMPLE_SELECT_BLOCK],
      [dummyWord, dummySel],
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
    const LineWithContent = buildWithContent<Word>({
      contentTypes: [ApiBlockType.Word, ApiBlockType.SelectionElement],
    })(LineGeneric);
    const line = new LineWithContent(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(line.nContentItems).toStrictEqual(2);
    expect(line.getText({ skipBlockTypes: [ApiBlockType.Line] })).toStrictEqual("");
    expect(line.getText({ skipBlockTypes: [ApiBlockType.Word] })).toStrictEqual(dummySel.text);
    expect(line.getText({ skipBlockTypes: [ApiBlockType.SelectionElement] })).toStrictEqual(dummyWord.text);
    expect(line.getText({ includeBlockTypes: [ApiBlockType.Line] })).toStrictEqual("");
    expect(line.getText({ includeBlockTypes: [ApiBlockType.Word] })).toStrictEqual("");
    expect(line.getText({ includeBlockTypes: [ApiBlockType.Line, ApiBlockType.Word] })).toStrictEqual(
      dummyWord.text,
    );
    expect(warn).toHaveBeenCalledTimes(0);

    const ContentWithWordsOnly = buildWithContent<Word>({
      contentTypes: [ApiBlockType.Word],
    })(LineGeneric);
    const withStrictContent = new ContentWithWordsOnly(EXAMPLE_LINE_BLOCK, dummyPage);
    expect(() => withStrictContent.getText({ onUnexpectedBlockType: "error" })).toThrow();
    expect(() =>
      withStrictContent.getText({
        onUnexpectedBlockType: "error",
        skipBlockTypes: [ApiBlockType.SelectionElement],
      }),
    ).not.toThrow();
    expect(withStrictContent.getText({ onUnexpectedBlockType: "warn" })).toStrictEqual(
      withStrictContent.text,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockReset();
  });
});
