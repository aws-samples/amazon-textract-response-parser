import { ApiBlockType, ApiRelationshipType } from "../../src/api-models/base";
import { ApiBlock } from "../../src/api-models/document";
import { ApiDocumentMetadata } from "../../src/api-models/response";
import {
  AggregationMethod,
  ApiBlockWrapper,
  DocumentMetadata,
  IBlockManager,
  PageHostedApiBlockWrapper,
  aggregate,
  argMax,
  doesFilterAllowBlockType,
  escapeHtml,
  getIterable,
  indent,
  modalAvg,
  normalizeOptionalSet,
  setIntersection,
  setUnion,
} from "../../src/base";

// Precision limit for testing summary statistics
const PRECISION_DPS = 10;

describe("modalAvg", () => {
  it("calculates the modal average of an array of numbers", () => {
    expect(modalAvg([1, 2, 3, 3, 4, 4, 4, 5, 5, 6])).toStrictEqual(4);
    expect(modalAvg([0.9, 0.7, 0.8, 0.7, 0.6, 0.7, 0.6, 0.9])).toStrictEqual(0.7);
  });

  it("returns null for empty lists", () => {
    expect(modalAvg([])).toBeNull();
  });

  it("breaks ties by choosing one candidate", () => {
    const avg = modalAvg([4, 5, 4, 5, 4, 5, 1, 1]) as number;
    expect(avg).not.toBeNull();
    expect([4, 5].indexOf(avg)).toBeGreaterThanOrEqual(0);
  });
});

describe("aggregate", () => {
  it("returns expected values for empty inputs", () => {
    expect(aggregate([], AggregationMethod.GeometricMean)).toBeNull();
    expect(aggregate([], AggregationMethod.Max)).toBeNull();
    expect(aggregate([], AggregationMethod.Mean)).toBeNull();
    expect(aggregate([], AggregationMethod.Min)).toBeNull();
    expect(aggregate([], AggregationMethod.Mode)).toBeNull();
  });

  it("supports geometric mean value aggregation of positive numbers", () => {
    expect(aggregate([1, 1, 8], AggregationMethod.GeometricMean)).toStrictEqual(2);
    expect(
      (aggregate([4, 1, 1 / 32], AggregationMethod.GeometricMean) as number).toFixed(PRECISION_DPS),
    ).toStrictEqual((0.5).toFixed(PRECISION_DPS));
  });

  it("supports max value aggregation", () => {
    expect(aggregate([1, 0, 2, 10, 5, 8, 7], AggregationMethod.Max)).toStrictEqual(10);
    expect(aggregate([-1000, 24, 24.0001], AggregationMethod.Max)).toStrictEqual(24.0001);
    expect(aggregate([-1, -10, -4], AggregationMethod.Max)).toStrictEqual(-1);
  });

  it("supports mean value aggregation", () => {
    expect(aggregate([-5, -1, 0, 1, 5], AggregationMethod.Mean)).toStrictEqual(0);
    expect(
      (aggregate([3.6, 6.3, 2.4], AggregationMethod.Mean) as number).toFixed(PRECISION_DPS),
    ).toStrictEqual((4.1).toFixed(PRECISION_DPS));
    expect(
      (aggregate([-3.6, -6.3, -2.4], AggregationMethod.Mean) as number).toFixed(PRECISION_DPS),
    ).toStrictEqual((-4.1).toFixed(PRECISION_DPS));
  });

  it("supports min value aggregation", () => {
    expect(aggregate([1, 0, 2, 10, 5, 8, 7], AggregationMethod.Min)).toStrictEqual(0);
    expect(aggregate([1000, -24, -24.0001], AggregationMethod.Min)).toStrictEqual(-24.0001);
    expect(aggregate([-1, -10, -4], AggregationMethod.Min)).toStrictEqual(-10);
  });

  it("supports modal average aggregation", () => {
    expect(aggregate([2, 4, 4, 5, 7, 100, 100.001], AggregationMethod.Mode)).toStrictEqual(4);
    expect(aggregate([-30, -2.3, -2.3, 0, 1], AggregationMethod.Mode)).toStrictEqual(-2.3);
    expect(aggregate([0, 1, 1, 1, 2, 2, 2, 2], AggregationMethod.Mode)).toStrictEqual(2);
  });

  it("works with iterables", () => {
    expect(
      aggregate(
        getIterable(() => [1, 0, 2, 10, 5, 8, 7]),
        AggregationMethod.Min,
      ),
    ).toStrictEqual(0);
    expect(
      aggregate(
        getIterable(() => [2, 4, 4, 5, 7, 100, 100.001]),
        AggregationMethod.Mode,
      ),
    ).toStrictEqual(4);
    expect(
      aggregate(
        getIterable(() => [-5, -1, 0, 1, 5]),
        AggregationMethod.Mean,
      ),
    ).toStrictEqual(0);
  });

  it("throws an error for unsupported aggregation types", () => {
    expect(() => aggregate([1, 2, 3], "foobar" as AggregationMethod)).toThrow("Unsupported aggMethod");
  });
});

describe("argMax", () => {
  it("returns expected values for empty inputs", () => {
    expect(argMax([])).toStrictEqual({ maxValue: -Infinity, maxIndex: -1 });
  });

  it("finds the first occurrence of the maximum number in the list", () => {
    expect(argMax([1, 5, 4, 2, 3])).toStrictEqual({ maxValue: 5, maxIndex: 1 });
    expect(argMax([-3, 4.7, 20, 0, 20])).toStrictEqual({ maxValue: 20, maxIndex: 2 });
    expect(argMax([Infinity, -Infinity, NaN, 0, Infinity])).toStrictEqual({
      maxValue: Infinity,
      maxIndex: 0,
    });
    expect(argMax([8, -6, NaN, 13, NaN, 3.14])).toStrictEqual({ maxValue: 13, maxIndex: 3 });
  });
});

describe("normalizeOptionalSet", () => {
  it("returns null for null/undefined inputs", () => {
    expect(normalizeOptionalSet(undefined)).toBe(null);
    expect(normalizeOptionalSet(null)).toBe(null);
  });

  it("returns the original object for set inputs", () => {
    const demoSet = new Set([1, 2, "hi", null]);
    expect(normalizeOptionalSet(demoSet)).toBe(demoSet);
  });

  it("converts arrays to sets", () => {
    const demoList = [1, 2, "hi", null];
    expect(normalizeOptionalSet(demoList)).toStrictEqual(new Set(demoList));
  });

  it("converts single values, even falsy ones, to sets", () => {
    const testObj = { cool: "yes" };
    expect(normalizeOptionalSet(testObj)).toStrictEqual(new Set([testObj]));
    expect(normalizeOptionalSet(false)).toStrictEqual(new Set([false]));
    expect(normalizeOptionalSet(0)).toStrictEqual(new Set([0]));
  });
});

describe("doesFilterAllowBlockType", () => {
  it("returns true for falsy and empty filter specs", () => {
    expect(doesFilterAllowBlockType(undefined, ApiBlockType.Word)).toBe(true);
    expect(doesFilterAllowBlockType(null, ApiBlockType.LayoutFigure)).toBe(true);
    expect(doesFilterAllowBlockType({}, ApiBlockType.LayoutFigure)).toBe(true);
    expect(
      doesFilterAllowBlockType({ includeBlockTypes: null, skipBlockTypes: null }, ApiBlockType.LayoutFigure),
    ).toBe(true);
    expect(
      doesFilterAllowBlockType(
        { includeBlockTypes: undefined, skipBlockTypes: undefined },
        ApiBlockType.LayoutFigure,
      ),
    ).toBe(true);
    expect(doesFilterAllowBlockType(false as unknown as null, ApiBlockType.Cell)).toBe(true);
  });

  it("returns false when blockType is skipped", () => {
    expect(
      doesFilterAllowBlockType({ skipBlockTypes: [ApiBlockType.Line, ApiBlockType.Word] }, ApiBlockType.Word),
    ).toBe(false);
    expect(
      doesFilterAllowBlockType(
        { skipBlockTypes: new Set([ApiBlockType.Table, ApiBlockType.Word]) },
        ApiBlockType.Word,
      ),
    ).toBe(false);
    expect(
      doesFilterAllowBlockType(
        { skipBlockTypes: new Set([ApiBlockType.Table, ApiBlockType.Word]) },
        ApiBlockType.Word,
      ),
    ).toBe(false);
    expect(doesFilterAllowBlockType(null, ApiBlockType.LayoutFigure)).toBe(true);
    expect(doesFilterAllowBlockType(false as unknown as null, ApiBlockType.Cell)).toBe(true);
  });

  it("requires blockType to be present in includeBlockTypes, when set", () => {
    expect(doesFilterAllowBlockType({ includeBlockTypes: [] }, ApiBlockType.Word)).toBe(false);
    expect(doesFilterAllowBlockType({ includeBlockTypes: new Set() }, ApiBlockType.Word)).toBe(false);
    expect(
      doesFilterAllowBlockType(
        { includeBlockTypes: [ApiBlockType.Line, ApiBlockType.Word] },
        ApiBlockType.Word,
      ),
    ).toBe(true);
    expect(
      doesFilterAllowBlockType({ includeBlockTypes: new Set([ApiBlockType.Word]) }, ApiBlockType.Word),
    ).toBe(true);
  });

  it("returns false if a blockType is both included and skipped", () => {
    expect(
      doesFilterAllowBlockType(
        { includeBlockTypes: [ApiBlockType.Word], skipBlockTypes: new Set([ApiBlockType.Word]) },
        ApiBlockType.Word,
      ),
    ).toBe(false);
    expect(
      doesFilterAllowBlockType(
        { includeBlockTypes: new Set([ApiBlockType.Word]), skipBlockTypes: [ApiBlockType.Word] },
        ApiBlockType.Word,
      ),
    ).toBe(false);
  });
});

describe("setIntersection", () => {
  it("returns a new empty set for empty inputs", () => {
    const [a, b] = [new Set(), new Set()];
    const result = setIntersection(a, b);
    expect(result).toStrictEqual(new Set());
    expect(result).not.toBe(a);
    expect(result).not.toBe(b);
  });

  it("intersects sets with diverse inputs", () => {
    const [a, b] = [new Set([null, undefined, 0, 1, false, true, ""]), new Set([0, true, "", {}, "hi"])];
    const result = setIntersection(a, b);
    expect(result).toStrictEqual(new Set([0, true, ""]));
  });

  it("intersects disjoint sets to empty", () => {
    const [a, b] = [new Set([null, undefined, 0, 1, false, true, ""]), new Set([{}, "hi"])];
    const result = setIntersection(a, b);
    expect(result).toStrictEqual(new Set());
  });
});

describe("setUnion", () => {
  it("returns a new empty set for empty inputs", () => {
    const [a, b] = [new Set(), new Set()];
    const result = setUnion(a, b);
    expect(result).toStrictEqual(new Set());
    expect(result).not.toBe(a);
    expect(result).not.toBe(b);
  });

  it("unions sets with diverse inputs", () => {
    const [a, b] = [new Set([null, undefined, 0, 1, false, true, ""]), new Set([0, true, "", {}, "hi"])];
    const result = setUnion(a, b);
    expect(result).toStrictEqual(new Set([null, undefined, 0, 1, false, true, "", {}, "hi"]));
  });

  it("unions disjoint sets", () => {
    const [a, b] = [new Set([null, undefined, 0, 1, false, true, ""]), new Set([{}, "hi"])];
    const result = setUnion(a, b);
    expect(result).toStrictEqual(new Set([null, undefined, 0, 1, false, true, "", {}, "hi"]));
  });
});

describe("documentMetadata", () => {
  it("fetches number of pages in document", () => {
    const docMetaDict = { Pages: 42 };
    const docMeta = new DocumentMetadata(docMetaDict);
    expect(docMeta.dict).toBe(docMetaDict);
    expect(docMeta.nPages).toStrictEqual(docMetaDict.Pages);
  });

  it("defaults missing page count to 0", () => {
    expect(new DocumentMetadata({} as ApiDocumentMetadata).nPages).toStrictEqual(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(new DocumentMetadata(undefined as any).nPages).toStrictEqual(0);
  });
});

describe("escapeHtml", () => {
  it("escapes only [&<>] by default for use in general text nodes", () => {
    expect(escapeHtml(`A "fun" example & a 'great' function >_< !?`)).toStrictEqual(
      `A "fun" example &amp; a 'great' function &gt;_&lt; !?`,
    );
  });

  it(`escapes [&<>'"] when configured for use in node attributes`, () => {
    expect(escapeHtml(`A "fun" example & a 'great' function >_< !?`, { forAttr: true })).toStrictEqual(
      `A &quot;fun&quot; example &amp; a &#39;great&#39; function &gt;_&lt; !?`,
    );
  });
});

describe("indent", () => {
  it("indents text with one tab by default", () => {
    expect(indent("I'm a\nbasic kind of\nstring you know")).toStrictEqual(
      "\tI'm a\n\tbasic kind of\n\tstring you know",
    );
  });

  it("can customize level of indentation", () => {
    expect(indent("I'm a\nbasic kind of\nstring you know", { count: 3 })).toStrictEqual(
      "\t\t\tI'm a\n\t\t\tbasic kind of\n\t\t\tstring you know",
    );
  });

  it("can customize indentation prefix", () => {
    expect(indent("I'm a\nbasic kind of\nstring you know", { character: "dog", count: 3 })).toStrictEqual(
      "dogdogdogI'm a\ndogdogdogbasic kind of\ndogdogdogstring you know",
    );
  });

  it("can omit first line indentation", () => {
    expect(indent("I'm a\nbasic kind of\nstring you know", { skipFirstLine: true })).toStrictEqual(
      "I'm a\n\tbasic kind of\n\tstring you know",
    );
  });

  it("can indent empty lines (but doesn't by default)", () => {
    const rawStr = "I'm a\n\nstring you know";
    expect(indent(rawStr)).toStrictEqual("\tI'm a\n\n\tstring you know");
    expect(indent(rawStr, { includeEmptyLines: true })).toStrictEqual("\tI'm a\n\t\n\tstring you know");
  });
});

describe("ApiBlockWrapper", () => {
  it("fetches related blocks filtered by one or more relationship types", () => {
    const wrapper = new ApiBlockWrapper({
      BlockType: ApiBlockType.Line,
      Id: "DUMMY-1",
      Relationships: [
        {
          Ids: ["DUMMY-2", "DUMMY-3"],
          Type: ApiRelationshipType.Answer,
        },
        {
          Ids: ["DUMMY-4", "DUMMY-5", "DUMMY-6"],
          Type: ApiRelationshipType.Child,
        },
        {
          Ids: ["DUMMY-7", "DUMMY-8"],
          Type: ApiRelationshipType.ComplexFeatures,
        },
        {
          Ids: ["DUMMY-9", "DUMMY-0"],
          Type: ApiRelationshipType.Child,
        },
      ],
    } as unknown as ApiBlock);
    expect(wrapper.childBlockIds).toStrictEqual(["DUMMY-4", "DUMMY-5", "DUMMY-6", "DUMMY-9", "DUMMY-0"]);
    expect(wrapper.relatedBlockIdsByRelType(ApiRelationshipType.ComplexFeatures)).toStrictEqual([
      "DUMMY-7",
      "DUMMY-8",
    ]);
    expect(
      wrapper.relatedBlockIdsByRelType([ApiRelationshipType.ComplexFeatures, ApiRelationshipType.Answer]),
    ).toStrictEqual(["DUMMY-2", "DUMMY-3", "DUMMY-7", "DUMMY-8"]);
    expect(wrapper.relatedBlockIdsByRelType(ApiRelationshipType.MergedCell)).toStrictEqual([]);
  });
});

describe("PageHostedApiBlockWrapper", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyItemMap: { [id: string]: any } = {
    "DUMMY-1": { id: "DUMMY-1", blockType: ApiBlockType.Line },
    "DUMMY-2": { id: "DUMMY-2", blockType: ApiBlockType.QueryResult },
    "DUMMY-3": { id: "DUMMY-3", blockType: ApiBlockType.QueryResult },
    "DUMMY-4": { id: "DUMMY-4", blockType: ApiBlockType.Word },
    "DUMMY-5": { id: "DUMMY-5", blockType: ApiBlockType.Word },
    "DUMMY-6": { id: "DUMMY-6", blockType: ApiBlockType.Table },
    "DUMMY-7": { id: "DUMMY-7", blockType: ApiBlockType.Word },
    "DUMMY-8": { id: "DUMMY-8", blockType: ApiBlockType.Word },
    "DUMMY-9": { id: "DUMMY-9", blockType: ApiBlockType.Key },
    "DUMMY-0": { id: "DUMMY-0", blockType: ApiBlockType.Word },
  };
  const dummyHost: IBlockManager = {
    getItemByBlockId: (
      blockId: string,
      allowBlockTypes?: ApiBlockType | ApiBlockType[] | null | undefined,
    ) => {
      const item = dummyItemMap[blockId];
      if (allowBlockTypes) {
        if (Array.isArray(allowBlockTypes)) {
          if (!allowBlockTypes.includes(item.blockType)) {
            throw new Error(`Item for block ${blockId} has unexpected type ${item.blockType}`);
          }
        } else if (allowBlockTypes !== item.blockType) {
          throw new Error(`Item for block ${blockId} has unexpected type ${item.blockType}`);
        }
      }
      return item;
    },
    registerParsedItem: () => {},
    getBlockById: () => undefined,
    listBlocks: () => [],
  };
  const wrapper = new PageHostedApiBlockWrapper(
    {
      BlockType: ApiBlockType.Line,
      Id: "DUMMY-1",
      Relationships: [
        {
          Ids: ["DUMMY-2", "DUMMY-3"],
          Type: ApiRelationshipType.Answer,
        },
        {
          Ids: ["DUMMY-4", "DUMMY-5", "DUMMY-6"],
          Type: ApiRelationshipType.Child,
        },
        {
          Ids: ["DUMMY-7", "DUMMY-8"],
          Type: ApiRelationshipType.ComplexFeatures,
        },
        {
          Ids: ["DUMMY-9", "DUMMY-0"],
          Type: ApiRelationshipType.Child,
        },
      ],
    } as unknown as ApiBlock,
    dummyHost,
  );

  it("lists and iterates related items by relationship type, ignoring others by default", () => {
    const expectedItems = [
      dummyItemMap["DUMMY-4"],
      dummyItemMap["DUMMY-5"],
      dummyItemMap["DUMMY-6"],
      dummyItemMap["DUMMY-9"],
      dummyItemMap["DUMMY-0"],
    ];
    expect(wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child)).toStrictEqual(expectedItems);
    let ixItem = 0;
    for (const child of wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child)) {
      expect(child).toBe(expectedItems[ixItem]);
      ++ixItem;
    }
    expect(ixItem).toStrictEqual(expectedItems.length);
  });

  it("lists and iterates related items by multiple relationship types", () => {
    const expectedItems = [
      dummyItemMap["DUMMY-2"],
      dummyItemMap["DUMMY-3"],
      dummyItemMap["DUMMY-7"],
      dummyItemMap["DUMMY-8"],
    ];
    expect(
      wrapper.listRelatedItemsByRelType([ApiRelationshipType.Answer, ApiRelationshipType.ComplexFeatures]),
    ).toStrictEqual(expectedItems);
    let ixItem = 0;
    for (const child of wrapper.iterRelatedItemsByRelType([
      ApiRelationshipType.Answer,
      ApiRelationshipType.ComplexFeatures,
    ])) {
      expect(child).toBe(expectedItems[ixItem]);
      ++ixItem;
    }
    expect(ixItem).toStrictEqual(expectedItems.length);
  });

  it("filters related items by optional target block type(s)", () => {
    const expectedItems = [dummyItemMap["DUMMY-4"], dummyItemMap["DUMMY-5"], dummyItemMap["DUMMY-0"]];
    expect(
      wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child, { includeBlockTypes: ApiBlockType.Word }),
    ).toStrictEqual(expectedItems);
    expect(
      wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child, {
        includeBlockTypes: [ApiBlockType.Word],
      }),
    ).toStrictEqual(expectedItems);
    let ixItem = 0;
    for (const child of wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: ApiBlockType.Word,
    })) {
      expect(child).toBe(expectedItems[ixItem]);
      ++ixItem;
    }
    expect(ixItem).toStrictEqual(expectedItems.length);
    ixItem = 0;
    for (const child of wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: new Set([ApiBlockType.Word]),
    })) {
      expect(child).toBe(expectedItems[ixItem]);
      ++ixItem;
    }
    expect(ixItem).toStrictEqual(expectedItems.length);
  });

  it("optionally raises errors for unexpected related item types", () => {
    // Creating iterators should not throw:
    let iter = wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: ApiBlockType.Word,
      onUnexpectedBlockType: "error",
    });
    // But running them should:
    expect(() => [...iter]).toThrow(/DUMMY-6.*TABLE/);
    iter = wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: new Set([ApiBlockType.Word]),
      onUnexpectedBlockType: "error",
    });
    expect(() => [...iter]).toThrow(/DUMMY-6.*TABLE/);
    expect(() =>
      wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child, {
        includeBlockTypes: ApiBlockType.Word,
        onUnexpectedBlockType: "error",
      }),
    ).toThrow(/DUMMY-6.*TABLE/);
    expect(() =>
      wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child, {
        includeBlockTypes: [ApiBlockType.Word],
        onUnexpectedBlockType: "error",
      }),
    ).toThrow(/DUMMY-6.*TABLE/);
  });

  it("can ignore a subset of unexpected related item types", () => {
    let iter = wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: ApiBlockType.Word,
      onUnexpectedBlockType: "error",
      skipBlockTypes: [ApiBlockType.Table],
    });
    expect(() => [...iter]).toThrow(/DUMMY-9.*KEY/);
    iter = wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: [ApiBlockType.Word],
      onUnexpectedBlockType: "error",
      skipBlockTypes: [ApiBlockType.Table],
    });
    expect(() => [...iter]).toThrow(/DUMMY-9.*KEY/);
    expect(() =>
      wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child, {
        includeBlockTypes: ApiBlockType.Word,
        onUnexpectedBlockType: "error",
        skipBlockTypes: [ApiBlockType.Table],
      }),
    ).toThrow(/DUMMY-9.*KEY/);
    expect(() =>
      wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child, {
        includeBlockTypes: [ApiBlockType.Word],
        onUnexpectedBlockType: "error",
        skipBlockTypes: [ApiBlockType.Table],
      }),
    ).toThrow(/DUMMY-9.*KEY/);

    // Exceptions should only be thrown for blocks in the relevant identity type(s):
    iter = wrapper.iterRelatedItemsByRelType(
      [ApiRelationshipType.Answer, ApiRelationshipType.ComplexFeatures],
      {
        includeBlockTypes: [ApiBlockType.QueryResult, ApiBlockType.Word],
        onUnexpectedBlockType: "error",
      },
    );
    expect(() => [...iter]).not.toThrow();
    expect(() =>
      wrapper.listRelatedItemsByRelType([ApiRelationshipType.Answer, ApiRelationshipType.ComplexFeatures], {
        includeBlockTypes: [ApiBlockType.QueryResult, ApiBlockType.Word],
        onUnexpectedBlockType: "error",
      }),
    ).not.toThrow();
  });

  it("optionally logs warnings for unexpected related item types", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function

    // We rely on the other tests for full coverage, so this one just explores a range of scenarios:

    wrapper.listRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: ApiBlockType.Word,
      onUnexpectedBlockType: "warn",
    });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toMatch(/DUMMY-6.*TABLE/);
    expect(warn.mock.calls[1][0]).toMatch(/DUMMY-9.*KEY/);
    warn.mockClear();

    const iter = wrapper.iterRelatedItemsByRelType(ApiRelationshipType.Child, {
      includeBlockTypes: new Set([ApiBlockType.Word]),
      onUnexpectedBlockType: "warn",
      skipBlockTypes: [ApiBlockType.Key],
    });
    expect(warn).toHaveBeenCalledTimes(0);
    [...iter];
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/DUMMY-6.*TABLE/);
    warn.mockClear();
  });
});
