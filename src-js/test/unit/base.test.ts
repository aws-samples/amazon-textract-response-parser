import { modalAvg } from "../../src/base";

describe("modalAvg", () => {
  it("calculates the modal average of an array of numbers", () => {
    expect(modalAvg([1, 2, 3, 3, 4, 4, 4, 5, 5, 6])).toStrictEqual(4);
    expect(modalAvg([0.9, 0.7, 0.8, 0.7, 0.6, 0.7, 0.6, 0.9])).toStrictEqual(0.7);
  });

  it("breaks ties by choosing one candidate", () => {
    expect([4, 5].indexOf(modalAvg([4, 5, 4, 5, 4, 5, 1, 1]))).toBeGreaterThanOrEqual(0);
  });
});
