import { describe, expect, it } from "vitest";

import { TOFU_LOWER, TOFU_UPPER } from "../src/constants";
import {
  filterDiff,
  tagToTofu,
  toText,
  transfer,
} from "../src/transfer";
import type { RawDiff } from "../src/types";

const pages = "(\\[\\d+[ab]\\])";
const lines = "\\[\\d+.\\.\\d\\]";

describe("tagToTofu", () => {
  it("preserves capturing matches from U+30D40 and deletes patterns without a group", () => {
    const [text, mapping] = tagToTofu("[1a]Hello[1b]", [["pages", pages]]);
    expect([...text].map((ch) => ch.codePointAt(0))).toEqual([
      TOFU_LOWER,
      ..."Hello".split("").map((ch) => ch.codePointAt(0)),
      TOFU_LOWER + 1,
    ]);
    expect(mapping.get(String.fromCodePoint(TOFU_LOWER))).toEqual([
      "pages",
      "[1a]",
    ]);
    expect(mapping.get(String.fromCodePoint(TOFU_LOWER + 1))).toEqual([
      "pages",
      "[1b]",
    ]);

    const [deleted] = tagToTofu("[1a.1]Hello", [["lines", lines]]);
    expect(deleted).toBe("Hello");

    const [both] = tagToTofu("[1a][1a.1]Hello[1b]", [
      ["pages", pages],
      ["lines", lines],
    ]);
    expect([...both].map((ch) => ch.codePointAt(0))).toEqual([
      TOFU_LOWER,
      ..."Hello".split("").map((ch) => ch.codePointAt(0)),
      TOFU_LOWER + 1,
    ]);
  });

  it("wraps a single pair and throws on an empty list", () => {
    const [text, mapping] = tagToTofu("[1a]Hello", ["pages", pages]);
    expect(text.startsWith(String.fromCodePoint(TOFU_LOWER))).toBe(true);
    expect(mapping.size).toBe(1);
    expect(() => tagToTofu("a", [])).toThrow(RangeError);
  });

  it("throws when a capture group does not participate", () => {
    expect(() => tagToTofu("xb", [["t", "(a)|(b)"]])).toThrow(TypeError);
  });

  it("assigns consecutive ids with no collision skip", () => {
    const existing = String.fromCodePoint(TOFU_LOWER);
    const [text, mapping] = tagToTofu(`${existing}[1a]`, [["pages", pages]]);
    expect(mapping.get(existing)).toEqual(["pages", "[1a]"]);
    expect(text.includes(existing)).toBe(true);
    expect([...text].filter((ch) => ch === existing)).toHaveLength(2);
  });
});

describe("filterDiff", () => {
  const a = String.fromCodePoint(TOFU_LOWER);
  const b = String.fromCodePoint(TOFU_LOWER + 1);
  const raw = String.fromCodePoint(0x493e0);
  const mapping = new Map([
    [a, ["pages", "[1a]"]],
    [b, ["pages", "[1b]"]],
  ] as Array<[string, [string, string]]>);

  it("omits plain deletions and splits mixed tofu deletions", () => {
    const diffs: RawDiff[] = [
      [0, "keep"],
      [1, "ins"],
      [-1, "plain delete"],
      [-1, `xx${a}yy${raw}${b}`],
    ];
    const filtered = filterDiff(diffs, mapping);
    expect(filtered).toEqual([
      [0, "keep", ""],
      [1, "ins", ""],
      [-1, "xx", ""],
      [0, "[1a]", "pages"],
      [-1, "yy", ""],
      [-1, raw, ""],
      [0, "[1b]", "pages"],
    ]);
    expect(toText(filtered)).toBe("keepins[1a][1b]");
  });

  it("treats the inclusive upper bound as tofu and ignores the next code point", () => {
    const upper = String.fromCodePoint(TOFU_UPPER);
    const past = String.fromCodePoint(TOFU_UPPER + 1);
    expect(filterDiff([[-1, `a${upper}b`]], new Map())).toEqual([
      [-1, "a", ""],
      [-1, upper, ""],
      [-1, "b", ""],
    ]);
    expect(filterDiff([[-1, `a${past}b`]], new Map())).toEqual([]);
  });

  it("restores several tofu ids that share one deletion", () => {
    const filtered = filterDiff([[-1, a + b]], mapping);
    expect(filtered).toEqual([
      [0, "[1a]", "pages"],
      [0, "[1b]", "pages"],
    ]);
  });
});

describe("transfer edges", () => {
  it("returns the target when the source is empty", () => {
    expect(transfer("", [["pages", pages]], "cat", "txt")).toBe("cat");
  });

  it("keeps only preserved annotations when the target is empty", () => {
    expect(transfer("[1a]Hello", [["pages", pages]], "", "txt")).toBe("[1a]");
  });

  it("accepts a single pair and rejects an unknown output", () => {
    expect(transfer("[1a]Hello", ["pages", pages], "Hello", "txt")).toBe(
      "[1a]Hello",
    );
    expect(() =>
      transfer("a", [["pages", pages]], "a", "json" as "txt"),
    ).toThrow(ReferenceError);
  });

  it("throws on an empty pattern list and an invalid regex", () => {
    expect(() => transfer("a", [], "b")).toThrow(RangeError);
    expect(() => transfer("a", [["p", "("]], "b")).toThrow(SyntaxError);
  });

  it("splits an empty pattern the way Python does, instead of ignoring it", () => {
    expect(() => transfer("ab", [["p", ""]], "ab")).not.toThrow();
  });
});
