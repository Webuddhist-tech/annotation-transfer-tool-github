import { describe, expect, it } from "vitest";

import { compilePythonPattern, pythonSearch, pythonSplit } from "../src/regex";

describe("compilePythonPattern", () => {
  it("rewrites \\< and \\> and compiles an astral class with the u flag", () => {
    const hl = String.fromCodePoint(0x30d40);
    const hu = String.fromCodePoint(0xf4271);
    const pattern = `(\\<[${hl}-${hu}]?au)`;
    const re = compilePythonPattern(pattern);
    expect(re.flags).toBe("u");
    expect(re.global).toBe(false);
    const id = String.fromCodePoint(0x493e0);
    expect(pythonSearch(pattern, `<${id}auཁ`)).toBe(true);
    expect(compilePythonPattern("(g\\>)").exec("xg>y")?.[1]).toBe("g>");
    expect(compilePythonPattern("(\\>)").exec("a>b")?.[1]).toBe(">");
  });

  it("returns a fresh regexp so lastIndex cannot leak", () => {
    const a = compilePythonPattern("(a+)");
    const b = compilePythonPattern("(a+)");
    expect(a).not.toBe(b);
    a.lastIndex = 5;
    expect(b.lastIndex).toBe(0);
    expect(compilePythonPattern("(a+)").exec("aa")?.[1]).toBe("aa");
  });

  it("throws on an invalid pattern", () => {
    expect(() => compilePythonPattern("(")).toThrow(SyntaxError);
  });

  it("matches Unicode decimal digits and not only ASCII", () => {
    expect(pythonSearch("\\d", "༡")).toBe(true);
    expect(pythonSearch("\\d", "1")).toBe(true);
    expect(pythonSearch("\\D", "ཀ")).toBe(true);
  });

  it("matches CR and Unicode line separators with '.', and not LF", () => {
    expect(pythonSearch(".", "\r")).toBe(true);
    expect(pythonSearch(".", "\u2028")).toBe(true);
    expect(pythonSearch(".", "\u2029")).toBe(true);
    expect(pythonSearch(".", "\n")).toBe(false);
    expect(pythonSearch(".", String.fromCodePoint(0x493e0))).toBe(true);
  });
});

describe("pythonSplit", () => {
  it("matches Python re.split on the patterns fast-antx uses", () => {
    expect(pythonSplit("(\\[\\d+[ab]\\])", "[1a]Hello[1b]")).toEqual([
      "",
      "[1a]",
      "Hello",
      "[1b]",
      "",
    ]);
    expect(pythonSplit("\\[\\d+.\\.\\d\\]", "[1a.1]Hello\n[1b.2]X")).toEqual([
      "",
      "Hello\n",
      "X",
    ]);
    expect(pythonSplit("(#.+?#)", "#A# cat")).toEqual(["", "#A#", " cat"]);
    expect(pythonSplit("(/.+? )", "(/LATIN x )(/NUM y )z")).toEqual([
      "(",
      "/LATIN ",
      "x )(",
      "/NUM ",
      "y )z",
    ]);
    expect(pythonSplit("(\\<)", "<x<")).toEqual(["", "<", "x", "<", ""]);
  });

  it("inserts undefined for a group that did not participate", () => {
    expect(pythonSplit("(a)|(b)", "xb")).toEqual(["x", undefined, "b", ""]);
    expect(pythonSplit("(a)?b", "xb")).toEqual(["x", undefined, ""]);
    expect(pythonSplit("(a)?(b)", "xb")).toEqual(["x", undefined, "b", ""]);
  });

  it("follows Python zero-width and empty-pattern splits", () => {
    expect(pythonSplit("(a*)", "bbb")).toEqual([
      "",
      "",
      "b",
      "",
      "b",
      "",
      "b",
      "",
      "",
    ]);
    expect(pythonSplit("a*", "bbb")).toEqual(["", "b", "b", "b", ""]);
    expect(pythonSplit("", "ab")).toEqual(["", "a", "b", ""]);
    expect(pythonSplit("(a*)", "")).toEqual(["", "", ""]);
    expect(pythonSplit("(a*)", "a")).toEqual(["", "a", "", "", ""]);
    expect(pythonSplit("()", "ab")).toEqual(["", "", "a", "", "b", "", ""]);
    expect(pythonSplit("(a)", "")).toEqual([""]);
    expect(pythonSplit("(a)", "bbb")).toEqual(["bbb"]);
  });

  it("keeps non-capturing groups out of the parts and splits on CR", () => {
    expect(pythonSplit("(?:a)", "xaay")).toEqual(["x", "", "y"]);
    expect(pythonSplit("(.)", "a\rb")).toEqual(["", "a", "", "\r", "", "b", ""]);
    expect(pythonSplit("(\\d)", "a1b༡c")).toEqual(["a", "1", "b", "༡", "c"]);
  });
});

describe("pythonSearch", () => {
  it("throws on a missing string instead of coercing undefined", () => {
    expect(() => pythonSearch("(a)|(b)", undefined)).toThrow(TypeError);
    expect(() => pythonSearch("(a)", null)).toThrow(TypeError);
  });
});
