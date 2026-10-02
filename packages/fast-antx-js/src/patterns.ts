import {
  HFML_LOCAL_ID_LOWER,
  HFML_LOCAL_ID_UPPER,
} from "./constants.js";
import type { AnnotationPattern } from "./types.js";

const hl = String.fromCodePoint(HFML_LOCAL_ID_LOWER);
const hu = String.fromCodePoint(HFML_LOCAL_ID_UPPER);

/** Opening tag: one capturing group, optional local-id, then a suffix. JS-legal form of Python `\<`. */
function openTag(suffix: string): string {
  return `(<[${hl}-${hu}]?${suffix})`;
}

/**
 * HFML patterns from `fast_antx.ann_patterns`.
 * Order is behavior: typed closers run before generic `end-1`.
 * The label `cittation_start` is the reference spelling.
 */
export const HFML_ANN_PATTERN: AnnotationPattern[] = [
  ["author", openTag("au")],
  ["book-title", openTag("k1")],
  ["poti_title", openTag("k2")],
  ["chapter_title", openTag("k3")],
  ["cittation_start", openTag("g")],
  ["citation_end", "(g>)"],
  ["sabche_start", openTag("q")],
  ["sabche_end", "(q>)"],
  ["tsawa_start", openTag("m")],
  ["tsawa_end", "(m>)"],
  ["yigchung_start", openTag("y")],
  ["yigchung_end", "(y>)"],
  ["end-1", "(>)"],
];
