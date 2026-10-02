import { describe, expect, it } from "vitest";

import { DIFF_TIMEOUT } from "../src/constants";
import { createDiffEngine, getDiffs } from "../src/dmp";

describe("diff engine", () => {
  it("uses Diff_Timeout 0 and the Hello World golden diff", () => {
    const engine = createDiffEngine();
    expect(engine.Diff_Timeout).toBe(0);
    expect(DIFF_TIMEOUT).toBe(0);
    expect(getDiffs("Hello World.", "Goodbye World.")).toEqual([
      [-1, "Hell"],
      [1, "G"],
      [0, "o"],
      [1, "odbye"],
      [0, " World."],
    ]);
  });

  it("calls diff_main with default checklines for strings longer than 100", () => {
    const engine = createDiffEngine();
    const text1 = `${"ཀ".repeat(80)}\n${"ཁ".repeat(40)}`;
    const text2 = `${"ཀ".repeat(80)}\n${"ག".repeat(40)}`;
    expect(text1.length).toBeGreaterThan(100);
    expect(text2.length).toBeGreaterThan(100);

    const fromApi = getDiffs(text1, text2);
    const withDefaultChecklines = engine
      .diff_main(text1, text2)
      .map((diff) => [diff[0], diff[1]]);
    expect(fromApi).toEqual(withDefaultChecklines);
  });
});
