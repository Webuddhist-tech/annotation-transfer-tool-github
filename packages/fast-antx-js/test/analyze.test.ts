import { describe, expect, it } from "vitest";

import {
  analyzeSource,
  countCapturingGroups,
  describePattern,
  summarizeTransfer,
  toKeep,
  toRemove,
  transferDetailed,
  wrapsWholePattern,
} from "../src/analyze";
import { TOFU_LOWER } from "../src/constants";
import { tagToTofu, transfer } from "../src/transfer";
import type { DiffRecord } from "../src/types";

const pages = "(\\[[0-9]+[ab]\\])";
const lines = "\\[[0-9]+[ab]\\.[0-9]+\\]";

describe("describePattern", () => {
  it("reads Keep, Remove and custom from the groups", () => {
    expect(describePattern(pages).mode).toBe("keep");
    expect(describePattern(lines).mode).toBe("remove");
    expect(describePattern("\\((\\d+)\\)").mode).toBe("custom");
    expect(describePattern("(a)(b)").mode).toBe("custom");
    expect(describePattern("(a)b").mode).toBe("custom");
  });

  it("ignores non-capturing groups, escapes and classes", () => {
    expect(countCapturingGroups("(?:a)(?=b)(?!c)(?<=d)(?<!e)")).toBe(0);
    expect(countCapturingGroups("\\(a\\)")).toBe(0);
    expect(countCapturingGroups("[(]a[)]")).toBe(0);
    expect(countCapturingGroups("(?P<n>a)(?<m>b)")).toBe(2);
    expect(wrapsWholePattern("(a)|(b)")).toBe(false);
    expect(wrapsWholePattern("([)])")).toBe(true);
    expect(wrapsWholePattern("(a\\))")).toBe(true);
  });

  it("reports a short error for a pattern that does not compile", () => {
    expect(describePattern("(abc").error).toMatch(/never closed/);
    expect(describePattern("abc)").error).toMatch(/no matching/);
    expect(describePattern("[abc").error).toMatch(/never closed/);
    expect(describePattern("*a").error).toMatch(/quantifier/);
    expect(describePattern(pages).error).toBeNull();
    expect(describePattern("").error).toBeNull();
  });

  it("toggles between Keep and Remove without touching custom patterns", () => {
    expect(toKeep(lines)).toBe(`(${lines})`);
    expect(toRemove(pages)).toBe("\\[[0-9]+[ab]\\]");
    expect(toKeep(pages)).toBe(pages);
    expect(toRemove(lines)).toBe(lines);
    expect(toKeep("(a)b")).toBe("(a)b");
    expect(toRemove("(a)b")).toBe("(a)b");
    expect(toKeep("")).toBe("");
  });
});

describe("analyzeSource", () => {
  const source = "[1a]\n[1a.1]Hello {sic}\n[1a.2]World\n[1b]\n[1b.1]End\n";

  it("counts in rule order and maps spans back to the original source", () => {
    const result = analyzeSource(source, [
      ["lines", `(${lines})`],
      ["pages", pages],
      ["note", "\\{[^}]*\\}"],
    ]);

    expect(result.map((r) => r.count)).toEqual([3, 2, 1]);
    expect(result.map((r) => r.mode)).toEqual(["keep", "keep", "remove"]);
    for (const rule of result) {
      for (const [s, e] of rule.spans) {
        const text = source.slice(s, e);
        expect(text).toMatch(rule.label === "note" ? /^\{.*\}$/ : /^\[.*\]$/);
      }
    }
    expect(result[1].spans.map(([s, e]) => source.slice(s, e))).toEqual(["[1a]", "[1b]"]);
  });

  it("agrees with tagToTofu on how many markers are tagged", () => {
    const rules: [string, string][] = [
      ["pages", pages],
      ["lines", `(${lines})`],
    ];
    const [, mapping] = tagToTofu(source, rules);
    const analysis = analyzeSource(source, rules);
    const total = analysis.reduce((sum, r) => sum + (r.mode === "keep" ? r.count : 0), 0);
    expect(total).toBe(mapping.size);
  });

  it("shows that order changes the result", () => {
    const first = analyzeSource(source, [
      ["pages", pages],
      ["lines", `(${lines})`],
    ]);
    const second = analyzeSource(source, [
      ["pages", "(\\[[^\\]]+\\])"],
      ["lines", `(${lines})`],
    ]);
    expect(first[1].count).toBe(3);
    expect(second[0].count).toBe(5);
    expect(second[1].count).toBe(0);
  });

  it("skips empty, broken and non-participating rules and reports them", () => {
    const result = analyzeSource("xb", [
      ["empty", ""],
      ["broken", "(a"],
      ["partial", "(a)|(b)"],
      ["ok", "(b)"],
    ]);
    expect(result[0].count).toBe(0);
    expect(result[0].error).toBeNull();
    expect(result[1].error).toMatch(/never closed/);
    expect(result[2].error).toMatch(/did not take part/);
    expect(result[3].count).toBe(1);
  });
});

describe("summarizeTransfer and transferDetailed", () => {
  it("lists tagged markers that did not come back", () => {
    const a = String.fromCodePoint(TOFU_LOWER);
    const b = String.fromCodePoint(TOFU_LOWER + 1);
    const mapping = new Map<string, [string, string]>([
      [a, ["pages", "[1a]"]],
      [b, ["pages", "[1b]"]],
    ]);
    const records: DiffRecord[] = [
      [0, "[1a]", "pages"],
      [0, "Hello", ""],
      [1, "!", ""],
    ];
    const summary = summarizeTransfer(records, mapping);
    expect(summary.text).toBe("[1a]Hello!");
    expect(summary.placed).toBe(1);
    expect(summary.missing).toEqual([{ label: "pages", text: "[1b]" }]);
  });

  it("produces the same text as transfer", () => {
    const source = "[1a]\n[1a.1]Hello\n[1a.2]World\n";
    const target = "Hello\nWorld\n";
    const rules: [string, string][] = [
      ["pages", pages],
      ["lines", lines],
    ];
    const detailed = transferDetailed(source, rules, target);
    expect(detailed.text).toBe(transfer(source, rules, target, "txt"));
    expect(detailed.placed).toBe(1);
    expect(detailed.missing).toEqual([]);
  });
});
