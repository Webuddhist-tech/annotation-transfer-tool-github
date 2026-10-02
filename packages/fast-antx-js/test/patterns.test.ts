import { describe, expect, it } from "vitest";

import { HFML_ANN_PATTERN } from "../src/patterns";
import { compilePythonPattern, pythonSearch } from "../src/regex";
import { tagToTofu } from "../src/transfer";

const LABELS = [
  "author",
  "book-title",
  "poti_title",
  "chapter_title",
  "cittation_start",
  "citation_end",
  "sabche_start",
  "sabche_end",
  "tsawa_start",
  "tsawa_end",
  "yigchung_start",
  "yigchung_end",
  "end-1",
];

describe("HFML_ANN_PATTERN", () => {
  it("keeps reference labels, including the cittation_start spelling, and end-1 last", () => {
    expect(HFML_ANN_PATTERN.map(([label]) => label)).toEqual(LABELS);
    expect(HFML_ANN_PATTERN.at(-1)?.[0]).toBe("end-1");
    const endIndex = LABELS.indexOf("end-1");
    expect(LABELS.indexOf("citation_end")).toBeLessThan(endIndex);
    expect(LABELS.indexOf("sabche_end")).toBeLessThan(endIndex);
    expect(LABELS.indexOf("tsawa_end")).toBeLessThan(endIndex);
    expect(LABELS.indexOf("yigchung_end")).toBeLessThan(endIndex);
  });

  it("compiles every pattern and matches an astral local id", () => {
    const id = String.fromCodePoint(0x493e0);
    for (const [, pattern] of HFML_ANN_PATTERN) {
      expect(() => compilePythonPattern(pattern)).not.toThrow();
      expect(compilePythonPattern(pattern).flags).toBe("u");
    }
    const start = HFML_ANN_PATTERN.find(([label]) => label === "cittation_start")!;
    expect(pythonSearch(start[1], `<${id}gག`)).toBe(true);
    const closer = HFML_ANN_PATTERN.find(([label]) => label === "citation_end")!;
    expect(pythonSearch(closer[1], "g>")).toBe(true);
    const generic = HFML_ANN_PATTERN.find(([label]) => label === "end-1")!;
    expect(pythonSearch(generic[1], ">")).toBe(true);
  });

  it("assigns typed closers before the generic > because of pattern order", () => {
    const id = String.fromCodePoint(0x493e0);
    const [, mapping] = tagToTofu(`<${id}gགགགg>`, HFML_ANN_PATTERN);
    const values = [...mapping.values()];
    expect(values).toContainEqual(["cittation_start", `<${id}g`]);
    expect(values).toContainEqual(["citation_end", "g>"]);
    expect(values.some(([, text]) => text === ">")).toBe(false);
  });
});
