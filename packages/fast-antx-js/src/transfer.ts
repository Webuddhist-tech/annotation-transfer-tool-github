import { TOFU_LOWER, TOFU_UPPER } from "./constants.js";
import { getDiffs } from "./dmp.js";
import { pythonSearch, pythonSplit } from "./regex.js";
import type {
  AnnotationPattern,
  DiffRecord,
  OutputFormat,
  RawDiff,
  TofuMapping,
} from "./types.js";
import { toYaml } from "./yaml.js";

const UNICODE_MAX = 0x10ffff;

/**
 * Normalize the public pattern argument.
 * A single pair `["pages", "(...)"]` is wrapped, matching
 * `isinstance(annotations[0], str)`. An empty list throws.
 */
export function normalizePatterns(
  annotations: AnnotationPattern | AnnotationPattern[],
): AnnotationPattern[] {
  if (!Array.isArray(annotations) || annotations.length === 0) {
    throw new RangeError("list index out of range");
  }

  if (typeof annotations[0] === "string") {
    const pair = annotations as unknown as [unknown, unknown];
    if (typeof pair[1] !== "string") {
      throw new RangeError("list index out of range");
    }
    return [[pair[0] as string, pair[1]]];
  }

  return (annotations as AnnotationPattern[]).map((pair) => {
    if (!Array.isArray(pair) || typeof pair[1] !== "string") {
      throw new RangeError("list index out of range");
    }
    return [String(pair[0]), pair[1]];
  });
}

/**
 * Replace preserved annotation matches with tofu code points.
 * A capturing group keeps the match. A pattern with no capturing group
 * deletes it, because `re.split` never yields the match as its own piece.
 */
export function tagToTofu(
  content: string,
  annotations: AnnotationPattern | AnnotationPattern[],
): [string, TofuMapping] {
  if (typeof content !== "string") {
    throw new TypeError(
      "expected string or bytes-like object, got 'NoneType'",
    );
  }

  const patterns = normalizePatterns(annotations);
  let newContent = content;
  const tofuMapping: TofuMapping = new Map();
  let tofuWalker = 0;

  for (const annotation of patterns) {
    const splitList = pythonSplit(annotation[1], newContent);
    for (let i = 0; i < splitList.length; i += 1) {
      const piece = splitList[i];
      // Python calls re.search on every piece, including None from a group
      // that did not participate. That raises TypeError. Do not coerce.
      if (pythonSearch(annotation[1], piece)) {
        const codePoint = tofuWalker + TOFU_LOWER;
        if (codePoint > UNICODE_MAX) {
          throw new RangeError("chr() arg not in range(0x110000)");
        }
        const tofu = String.fromCodePoint(codePoint);
        tofuWalker += 1;
        tofuMapping.set(tofu, [annotation[0], piece as string]);
        splitList[i] = tofu;
      }
    }
    newContent = splitList.join("");
  }

  return [newContent, tofuMapping];
}

function containsTofu(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && cp >= TOFU_LOWER && cp <= TOFU_UPPER) {
      return true;
    }
  }
  return false;
}

/**
 * Split a deletion on each code point in U+30D40–U+10F800.
 * Mirrors `re.split` with one capturing class: empty edge pieces are kept
 * and later skipped by the falsy check.
 */
function splitOnTofu(text: string): string[] {
  const parts: string[] = [];
  let buf = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= TOFU_LOWER && cp <= TOFU_UPPER) {
      parts.push(buf);
      parts.push(ch);
      buf = "";
    } else {
      buf += ch;
    }
  }
  parts.push(buf);
  return parts;
}

/**
 * Keep target insertions and equal text.
 * Deletions that contain a tofu-range code point are split.
 * A mapped id is restored as op 0. Other deletions are omitted entirely
 * when they contain no tofu-range code point.
 */
export function filterDiff(
  diffs: RawDiff[],
  tofuMapping: TofuMapping,
): DiffRecord[] {
  const result: DiffRecord[] = [];

  for (const [diffType, diffText] of diffs) {
    if (diffType === 0 || diffType === 1) {
      result.push([diffType, diffText, ""]);
      continue;
    }
    if (diffType !== -1) continue;
    if (!containsTofu(diffText)) continue;

    for (const ann of splitOnTofu(diffText)) {
      if (!ann) continue;
      const mapped = tofuMapping.get(ann);
      if (mapped) {
        const [tag, value] = mapped;
        result.push([0, value, tag]);
      } else {
        result.push([-1, ann, ""]);
      }
    }
  }

  return result;
}

/** Concatenate every chunk whose op is not -1. No separator and no added newline. */
export function toText(diffs: DiffRecord[]): string {
  let result = "";
  for (const diff of diffs) {
    if (diff[0] !== -1) result += diff[1];
  }
  return result;
}

/**
 * Transfer annotations from `source` onto `target`.
 * Default output is `"txt"`. Any other output string throws.
 */
export function transfer(
  source: string,
  patterns: AnnotationPattern | AnnotationPattern[],
  target: string,
  output: OutputFormat = "txt",
): string | DiffRecord[] {
  if (typeof source !== "string" || typeof target !== "string") {
    throw new TypeError(
      "expected string or bytes-like object, got 'NoneType'",
    );
  }

  const [tofuSource, tofuMapping] = tagToTofu(source, patterns);
  const diffs = getDiffs(tofuSource, target);
  const filtered = filterDiff(diffs, tofuMapping);

  if (output === "diff") return filtered;
  if (output === "yaml") return toYaml(filtered);
  if (output === "txt") return toText(filtered);

  // Python leaves `result` unset and raises UnboundLocalError.
  throw new ReferenceError("invalid output");
}
