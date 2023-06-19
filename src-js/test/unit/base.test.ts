import { AggregationMethod, aggregate, argMax, modalAvg } from "../../src/base";

// Precision limit for testing summary statistics
const EPSILON = 1e-15;

describe("modalAvg", () => {
  it("calculates the modal average of an array of numbers", () => {
    expect(modalAvg([1, 2, 3, 3, 4, 4, 4, 5, 5, 6])).toStrictEqual(4);
    expect(modalAvg([0.9, 0.7, 0.8, 0.7, 0.6, 0.7, 0.6, 0.9])).toStrictEqual(0.7);
  });

  it("returns NaN for empty lists", () => {
    expect(modalAvg([])).toBeNaN();
  });

  it("breaks ties by choosing one candidate", () => {
    const avg = modalAvg([4, 5, 4, 5, 4, 5, 1, 1]) as number;
    expect(avg).not.toBeNull();
    expect([4, 5].indexOf(avg)).toBeGreaterThanOrEqual(0);
  });
});

describe("aggregate", () => {
  it("returns expected values for empty inputs", () => {
    expect(aggregate([], AggregationMethod.GeometricMean)).toBeNaN();
    expect(aggregate([], AggregationMethod.Max)).toStrictEqual(-Infinity);
    expect(aggregate([], AggregationMethod.Mean)).toBeNaN();
    expect(aggregate([], AggregationMethod.Min)).toStrictEqual(Infinity);
    expect(aggregate([], AggregationMethod.Mode)).toBeNaN();
  });

  it("supports geometric mean value aggregation of positive numbers", () => {
    expect(aggregate([1, 1, 8], AggregationMethod.GeometricMean)).toStrictEqual(2);
    expect(
      Math.abs((aggregate([4, 1, 1 / 32], AggregationMethod.GeometricMean) as number) - 0.5)
    ).toBeLessThan(EPSILON);
  });

  it("supports max value aggregation", () => {
    expect(aggregate([1, 0, 2, 10, 5, 8, 7], AggregationMethod.Max)).toStrictEqual(10);
    expect(aggregate([-1000, 24, 24.0001], AggregationMethod.Max)).toStrictEqual(24.0001);
    expect(aggregate([-1, -10, -4], AggregationMethod.Max)).toStrictEqual(-1);
  });

  it("supports mean value aggregation", () => {
    expect(aggregate([-5, -1, 0, 1, 5], AggregationMethod.Mean)).toStrictEqual(0);
    expect(Math.abs((aggregate([3.6, 6.3, 2.4], AggregationMethod.Mean) as number) - 4.1)).toBeLessThan(
      EPSILON
    );
    expect(Math.abs((aggregate([-3.6, -6.3, -2.4], AggregationMethod.Mean) as number) + 4.1)).toBeLessThan(
      EPSILON
    );
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
