# Annotation Transfer

A browser app for moving annotations from a marked source onto a plain target. The transfer runs in a web worker. The texts stay in the browser.

`packages/fast-antx-js` is a TypeScript port of [fast-antx](https://github.com/OpenPecha/fast-antx). It follows the same steps the Python package uses in production, and it calls diff-match-patch directly.

```
annotation-transfer/
├── package.json
├── packages/
│   └── fast-antx-js/
└── web/
```

## From the Python package to TypeScript

Python fast-antx marks the annotations, writes temp files, and starts the `node-dmp-cli` binary for the diff. The TypeScript package does that work in one process.

Each rule is a label and a Python-style regular expression. A capturing group keeps the match. A pattern with no capturing group deletes the match before the diff. Kept matches become private-use characters (tofu ids). The marked source is then diffed against the plain target with diff-match-patch, `Diff_Timeout` set to `0`, the same setting as node-dmp-cli v0.0.3. The ids are written back as the original annotations. Output is `txt`, `diff`, or `yaml`.

The same transfer was run through the original Python package and through this port. For all three patterns below, the `txt` output is byte-for-byte the same, and the `diff` output matches chunk by chunk (about 1,790 chunks). The `yaml` output has the same content. Only the quoting style differs, between PyYAML and the JavaScript `yaml` package.

| Pattern | Python | TypeScript | txt | diff |
| --- | ---: | ---: | --- | --- |
| `(#.+?)` | 11.6 s | 1.4 s | identical | identical |
| `(#.+)` | 8.6 s | 1.1 s | identical | identical |
| `(#.+\n)` | 6.5 s | 1.1 s | identical | identical |

The TypeScript run is about 6 to 8 times faster. Python writes temp files and starts the Node binary on every call. The port calls diff-match-patch in process, so that overhead is gone.

`(#.+?)` only captures `#` plus one character. A lazy `.+?` with nothing after it stops as soon as it can, so the target gets short `#` fragments, not the heading text. For the full heading, use `(#.+)`. Use `(#.+\n)` when the heading should keep its line break. Both implementations do this. The pattern decides the match.

## Set it up

From this folder:

```bash
npm install
npm test
npm run dev
```

Open the URL Vite prints. `npm run build` writes the static site to `web/dist`. `npm run preview` serves that build.

To use the library on its own:

```bash
npm run build -w fast-antx-js
```

Then import `transfer` from `fast-antx-js`. Relative imports in `packages/fast-antx-js/src/` include the `.js` extension, so plain Node can load `dist/` the same way Vite does. See `packages/fast-antx-js/README.md` for the call shape and the regex notes.

## The website

- **Source** is the annotated text. **Target** is the plain text. You can paste, drop, or upload a `.txt` file. **Load the sample pair** fills source, target, and rules together.
- **Rules** are a type name plus a Python-style regular expression. **Keep** copies each match onto the target. **Remove** deletes it before the comparison. Rules run from top to bottom, and you can move them. **Import** and **Export** use a pattern file such as `[["pages", "(\\[[0-9]+[ab]\\])"]]`. **Add a preset** inserts the HFML tag set (13 rules) in the order the engine expects.
- Matches are counted as you type and highlighted in the source. **Transfer** (or Ctrl+Enter) fills the **After** tab. From there you can copy the result or download a `.txt` file. Markers that did not land are listed under the button.
- The header switches between English and Tibetan, and between a stacked layout and a side-by-side layout. **Reset** clears the fields.

## Hosting

The website is hosted on GitHub Pages. The workflow in `.github/workflows/pages.yml` builds the site and publishes `web/dist` on every push to `main`.
