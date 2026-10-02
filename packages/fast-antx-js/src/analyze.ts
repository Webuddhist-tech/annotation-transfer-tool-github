import { TOFU_LOWER } from "./constants.js";
import { getDiffs } from "./dmp.js";
import { compilePythonPattern, pythonSearch } from "./regex.js";
import { filterDiff, tagToTofu, toText } from "./transfer.js";
import type { AnnotationPattern, DiffRecord, TofuMapping } from "./types.js";

/**
 * Read-only helpers for a UI that sits on top of `transfer`.
 * Nothing here changes what `transfer` produces.
 */

export type RuleMode = "keep" | "remove" | "custom";

export interface PatternDescription {
  mode: RuleMode;
  /** Number of capturing groups. */
  groups: number;
  /** A short message when the pattern does not compile, else null. */
  error: string | null;
}

/** Position of one match in the original source, as UTF-16 offsets. */
export type Span = [start: number, end: number];

export interface RuleAnalysis {
  label: string;
  mode: RuleMode;
  error: string | null;
  /** Keep: tagged pieces. Remove/custom: matches. */
  count: number;
  spans: Span[];
}

export interface MissingMarker {
  label: string;
  text: string;
}

export interface DetailedTransfer {
  text: string;
  /** Restored markers, by label. */
  placed: number;
  /** Markers that were tagged in the source but did not come back. */
  missing: MissingMarker[];
}

/**
 * Count capturing groups the way the engine's regex layer will see them.
 * `(?:`, `(?=`, `(?!`, `(?<=`, `(?<!` do not count. `(?P<n>` and `(?<n>` do.
 */
export function countCapturingGroups(pattern: string): number {
  let count = 0;
  let inClass = false;
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "[") {
      inClass = true;
      continue;
    }
    if (ch !== "(") continue;
    if (pattern[i + 1] !== "?") {
      count += 1;
      continue;
    }
    const rest = pattern.slice(i + 2, i + 5);
    if (rest.startsWith("P<") || (rest.startsWith("<") && rest[1] !== "=" && rest[1] !== "!")) {
      count += 1;
    }
  }
  return count;
}

/** True when the pattern is `( ... )` with the first `(` closing at the very end. */
export function wrapsWholePattern(pattern: string): boolean {
  if (!pattern.startsWith("(") || pattern[1] === "?" || !pattern.endsWith(")")) {
    return false;
  }
  if (pattern.length >= 2 && pattern[pattern.length - 2] === "\\") {
    // Count preceding backslashes: an odd number means the `)` is escaped.
    let slashes = 0;
    for (let i = pattern.length - 2; i >= 0 && pattern[i] === "\\"; i -= 1) slashes += 1;
    if (slashes % 2 === 1) return false;
  }
  let depth = 0;
  let inClass = false;
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "[") {
      inClass = true;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i === pattern.length - 1;
    }
  }
  return false;
}

function friendlyRegexError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("unterminated group")) {
    return "A group is opened with ( but never closed.";
  }
  if (m.includes("unmatched ')'") || m.includes("unmatched )")) {
    return "A ) has no matching (.";
  }
  if (m.includes("unterminated character class")) {
    return "A [ is opened but never closed.";
  }
  if (m.includes("nothing to repeat")) {
    return "A quantifier (*, +, ?) has nothing before it.";
  }
  if (m.includes("lone quantifier brackets")) {
    return "A { or } needs to be escaped as \\{ or \\}.";
  }
  if (m.includes("range out of order")) {
    return "A range inside [ ] is out of order.";
  }
  if (m.includes("invalid escape")) {
    return "An escape sequence is not valid.";
  }
  const detail = message.replace(/^Invalid regular expression:\s*/i, "").replace(/^\/.*?\/[a-z]*:\s*/i, "");
  return detail ? `This pattern won't compile: ${detail}` : "This pattern won't compile.";
}

export function describePattern(pattern: string): PatternDescription {
  if (!pattern) {
    return { mode: "remove", groups: 0, error: null };
  }
  let error: string | null = null;
  try {
    compilePythonPattern(pattern);
  } catch (err) {
    error = friendlyRegexError(err instanceof Error ? err.message : String(err));
  }
  const groups = countCapturingGroups(pattern);
  let mode: RuleMode = "custom";
  if (groups === 0) mode = "remove";
  else if (groups === 1 && wrapsWholePattern(pattern)) mode = "keep";
  return { mode, groups, error };
}

/** Wrap a Remove pattern in one group. Keep and custom patterns are returned unchanged. */
export function toKeep(pattern: string): string {
  const { mode } = describePattern(pattern);
  if (mode !== "remove" || !pattern) return pattern;
  return `(${pattern})`;
}

/** Strip the outer group of a Keep pattern. Remove and custom patterns are returned unchanged. */
export function toRemove(pattern: string): string {
  const { mode } = describePattern(pattern);
  if (mode !== "keep") return pattern;
  return pattern.slice(1, -1);
}

const TOFU_UNITS = String.fromCodePoint(TOFU_LOWER).length; // 2 (surrogate pair)

/**
 * Walk the rules in order exactly as `tagToTofu` does, but keep a map from
 * every UTF-16 unit of the working text back to its offset in the original
 * source, so matches can be reported where the user typed them.
 *
 * Rules with an empty pattern, a pattern that does not compile, or a group
 * that does not take part in a match are reported with an error and skipped.
 * Skipping mirrors nothing in the engine; the engine would throw. The UI
 * blocks the transfer while any rule has an error.
 */
export function analyzeSource(
  source: string,
  rules: AnnotationPattern[],
): RuleAnalysis[] {
  let content = source;
  // origMap[i] = original offset of working unit i; origMap[content.length] = source.length.
  let origMap: number[] = new Array(source.length + 1);
  for (let i = 0; i <= source.length; i += 1) origMap[i] = i;

  const results: RuleAnalysis[] = [];

  for (const [label, pattern] of rules) {
    const description = describePattern(pattern);
    const result: RuleAnalysis = {
      label,
      mode: description.mode,
      error: description.error,
      count: 0,
      spans: [],
    };
    results.push(result);
    if (!pattern || description.error) continue;

    const base = compilePythonPattern(pattern);
    const re = new RegExp(base.source, "dgu");

    const nextContent: string[] = [];
    const nextMap: number[] = [];
    let last = 0;
    let guard = 0;
    let failed = false;

    const pushRange = (s: number, e: number) => {
      if (e <= s) return;
      nextContent.push(content.slice(s, e));
      for (let i = s; i < e; i += 1) nextMap.push(origMap[i]);
    };

    while (guard++ < content.length + 2) {
      const match = re.exec(content);
      if (match === null) break;
      const start = match.index;
      const end = start + match[0].length;
      const indices = match.indices!;

      pushRange(last, start);

      if (match.length === 1) {
        // No groups: the whole match is dropped.
        result.count += 1;
        result.spans.push([origMap[start], origMap[end]]);
      } else {
        let tagged = false;
        for (let g = 1; g < match.length; g += 1) {
          const piece = match[g];
          if (piece === undefined) {
            result.error = "A group did not take part in a match. Every group must match every time.";
            failed = true;
            break;
          }
          const [gs, ge] = indices[g]!;
          if (pythonSearch(pattern, piece)) {
            tagged = true;
            const tofu = String.fromCodePoint(TOFU_LOWER);
            nextContent.push(tofu);
            for (let k = 0; k < TOFU_UNITS; k += 1) nextMap.push(origMap[gs]);
            result.spans.push([origMap[gs], origMap[ge]]);
          } else {
            pushRange(gs, ge);
          }
        }
        if (failed) break;
        result.count += tagged || description.mode === "custom" ? 1 : 0;
      }

      last = end;
      if (match[0].length === 0 && re.lastIndex === start) {
        const cp = content.codePointAt(start);
        re.lastIndex = start + (cp !== undefined && cp > 0xffff ? 2 : 1);
      }
    }

    if (failed) {
      result.count = 0;
      result.spans = [];
      continue;
    }

    pushRange(last, content.length);
    nextMap.push(source.length);
    content = nextContent.join("");
    origMap = nextMap;
  }

  return results;
}

/** Compare tagged markers to restored labeled records. */
export function summarizeTransfer(
  records: DiffRecord[],
  mapping: TofuMapping,
): DetailedTransfer {
  const placedCounts = new Map<string, number>();
  let placed = 0;
  for (const [op, text, label] of records) {
    if (op !== 0 || !label) continue;
    placed += 1;
    const key = `${label}\u0000${text}`;
    placedCounts.set(key, (placedCounts.get(key) ?? 0) + 1);
  }

  const missing: MissingMarker[] = [];
  for (const [label, text] of mapping.values()) {
    const key = `${label}\u0000${text}`;
    const remaining = placedCounts.get(key) ?? 0;
    if (remaining > 0) {
      placedCounts.set(key, remaining - 1);
    } else {
      missing.push({ label, text });
    }
  }

  return { text: toText(records), placed, missing };
}

/** Same steps as `transfer(..., "txt")`, plus which tagged markers did not come back. */
export function transferDetailed(
  source: string,
  patterns: AnnotationPattern[],
  target: string,
): DetailedTransfer {
  const [tofuSource, mapping] = tagToTofu(source, patterns);
  const diffs = getDiffs(tofuSource, target);
  const filtered = filterDiff(diffs, mapping);
  return summarizeTransfer(filtered, mapping);
}
