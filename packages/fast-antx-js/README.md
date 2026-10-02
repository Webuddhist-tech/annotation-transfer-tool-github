# fast-antx-js

Browser-compatible behavioral port of [fast-antx](https://github.com/OpenPecha/fast-antx). It transfers annotations from a marked source onto a plain target with the same tofu-id mapping, preserve/delete regex rules, and JavaScript diff-match-patch settings as the Python package.

The Python package is the reference. This library does not shell out to `node-dmp-cli`, touch the filesystem, or run Python.

## Usage

```ts
import { transfer, HFML_ANN_PATTERN } from "fast-antx-js";

const annotated = transfer(
  "[1a]Hello\n[1a.1]World",
  [
    ["pages", "(\\[[0-9]+[ab]\\])"],
    ["lines", "\\[[0-9]+.\\\\.[0-9]\\]"],
  ],
  "Hello\nWorld",
  "txt",
);

transfer(layer, HFML_ANN_PATTERN, base, "txt");
```

`output` is `"txt"` (default), `"diff"`, or `"yaml"`. A capturing group preserves a match. A pattern with no capturing group deletes it.

Run the transfer inside a web worker when the texts are large. `Diff_Timeout` is `0`, matching node-dmp-cli v0.0.3, so a large divergent pair runs until the diff finishes.

## Behavioral notes

- Tofu ids start at U+30D40 and increase by one per preserved match. Only the source is encoded. There is no extra collision handling.
- Diff filtering scans U+30D40–U+10F800 by Unicode code point. Deletions with no character in that range are omitted. Mapped tofu ids are restored as op `0`.
- Text output concatenates every chunk whose op is not `-1`, with no added separator or newline.
- YAML is semantically the same data as PyYAML `safe_dump(..., allow_unicode=True)`: a list of `[op, text, label]`. It is YAML 1.2 from the `yaml` package and is **not** byte-identical to PyYAML 6.0.3 (folded single-quoted newlines, YAML 1.1 `yes`/`no` quoting). The Python tests assert text, not YAML bytes.
- `\<` and `\>` in a pattern are literal `<` and `>`, as in Python. Patterns are compiled with the `u` flag only.
- `\d` matches Unicode decimal digits (`\p{Nd}`), including Tibetan digits, as in Python 3.
- `.` matches one code point other than `\n`, including `\r`, U+2028, and U+2029.
- `\w` and `\s` keep JavaScript's definitions. The patterns shipped with fast-antx do not use them.
- Astral characters are not remapped before diffing. The reference engine is already JavaScript diff-match-patch.
- Invalid patterns, an empty pattern list, a nonparticipating capture passed to search, and an unknown `output` throw. They do not return a best-effort string.

## Build

```bash
npm install
npm test
npm run build
```

The published entry is `dist/`. It has no Node builtin imports (`fs`, `child_process`, `path`, `process`).
