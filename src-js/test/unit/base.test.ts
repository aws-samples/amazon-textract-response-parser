import { ApiBlockType, ApiRelationshipType } from "../../src/api-models/base";
import { ApiBlock } from "../../src/api-models/document";
import { ApiDocumentMetadata } from "../../src/api-models/response";
import {
  AggregationMethod,
  ApiBlockWrapper,
  DocumentMetadata,
  aggregate,
  argMax,
  escapeHtml,
  getIterable,
  indent,
  modalAvg,
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
