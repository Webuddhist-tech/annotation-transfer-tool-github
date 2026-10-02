/**
 * Compile a Python `re` pattern into a fresh Unicode-mode JavaScript RegExp.
 *
 * The rewritten source is cached. The RegExp object is not: a global regexp's
 * `lastIndex` would change later matches.
 *
 * Differences that this layer closes for the patterns fast-antx actually uses:
 * - Python identity escapes such as `\<` and `\>` (illegal in JS `u` mode)
 * - astral character-class ranges (require the `u` flag)
 * - Python `.` matches CR, U+2028, and U+2029, and does not match LF
 * - Python `\d` / `\D` are Unicode decimal digits (`\p{Nd}`)
 *
 * `\w` and `\s` stay JavaScript's definitions. Checked-in fast-antx patterns
 * do not use them. See the package README.
 */

const sourceCache = new Map<string, string>();

const SYNTAX_CHARS = new Set([
  "^",
  "$",
  "\\",
  ".",
  "*",
  "+",
  "?",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "|",
  "/",
]);

/** Python `.` is one code point other than `\n`, including CR and line separators. */
const PYTHON_DOT = "(?:.|\\r|\\u2028|\\u2029)";

export function compilePythonPattern(pattern: string): RegExp {
  let source = sourceCache.get(pattern);
  if (source === undefined) {
    source = rewritePythonPattern(pattern);
    // Validate once. Callers always receive a new instance.
    new RegExp(source, "u");
    sourceCache.set(pattern, source);
  }
  return new RegExp(source, "u");
}

export function rewritePythonPattern(pattern: string): string {
  let out = "";
  let inClass = false;
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === "\\") {
      if (i + 1 >= pattern.length) {
        out += "\\";
        break;
      }
      const next = pattern[i + 1];

      if (next === "\\") {
        out += "\\\\";
        i += 2;
        continue;
      }

      if (next === "d") {
        out += "\\p{Nd}";
        i += 2;
        continue;
      }
      if (next === "D") {
        out += "\\P{Nd}";
        i += 2;
        continue;
      }

      if ("sSwWbBnrtfv0".includes(next)) {
        out += "\\" + next;
        i += 2;
        continue;
      }

      if (next >= "1" && next <= "9") {
        out += "\\" + next;
        i += 2;
        continue;
      }

      if (next === "u") {
        const consumed = consumeUnicodeEscape(pattern, i);
        out += pattern.slice(i, i + consumed);
        i += consumed;
        continue;
      }

      if (next === "x") {
        const consumed = Math.min(4, pattern.length - i);
        out += pattern.slice(i, i + consumed);
        i += consumed;
        continue;
      }

      if (next === "c" || next === "k") {
        out += "\\" + next;
        i += 2;
        continue;
      }

      if ((next === "p" || next === "P") && pattern[i + 2] === "{") {
        const end = pattern.indexOf("}", i + 3);
        if (end !== -1) {
          out += pattern.slice(i, end + 1);
          i = end + 1;
          continue;
        }
      }

      if (SYNTAX_CHARS.has(next)) {
        out += "\\" + next;
        i += 2;
        continue;
      }

      // Python identity escape: `\<` is `<`. JS `u` mode rejects it.
      out += next;
      i += 2;
      continue;
    }

    if (ch === "[" && !inClass) {
      inClass = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "]" && inClass) {
      inClass = false;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "." && !inClass) {
      out += PYTHON_DOT;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function consumeUnicodeEscape(pattern: string, start: number): number {
  if (pattern[start + 2] === "{") {
    const end = pattern.indexOf("}", start + 3);
    if (end === -1) return pattern.length - start;
    return end + 1 - start;
  }
  return Math.min(6, pattern.length - start);
}

/**
 * Python `re.search`. Throws if `text` is not a string.
 * `RegExp.test(undefined)` would coerce to the string `"undefined"` and must not be used.
 */
export function pythonSearch(
  pattern: string,
  text: string | undefined | null,
): boolean {
  if (typeof text !== "string") {
    throw new TypeError(
      "expected string or bytes-like object, got 'NoneType'",
    );
  }
  return compilePythonPattern(pattern).exec(text) !== null;
}

/**
 * Python `re.split`, including capturing groups and zero-width matches.
 * A group that did not participate is `undefined` (Python `None`).
 * The full match is not inserted; only capturing groups are.
 */
export function pythonSplit(
  pattern: string,
  text: string,
): Array<string | undefined> {
  if (typeof text !== "string") {
    throw new TypeError(
      "expected string or bytes-like object, got 'NoneType'",
    );
  }

  const base = compilePythonPattern(pattern);
  const re = new RegExp(base.source, "gu");
  const parts: Array<string | undefined> = [];
  let last = 0;
  let guard = 0;

  while (guard++ < text.length + 2) {
    const match = re.exec(text);
    if (match === null) break;

    const start = match.index;
    const end = start + match[0].length;
    parts.push(text.slice(last, start));
    for (let group = 1; group < match.length; group += 1) {
      parts.push(match[group]);
    }
    last = end;

    if (match[0].length === 0 && re.lastIndex === start) {
      // Engines that fail to advance a zero-width match would loop forever.
      const cp = text.codePointAt(start);
      re.lastIndex = start + (cp !== undefined && cp > 0xffff ? 2 : 1);
    }
  }

  parts.push(text.slice(last));
  return parts;
}
