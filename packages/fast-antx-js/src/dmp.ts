/// <reference path="./diff-match-patch.d.ts" />
import { diff_match_patch as DiffMatchPatch } from "diff-match-patch";

import { DIFF_TIMEOUT } from "./constants.js";
import type { DiffOp, RawDiff } from "./types.js";

export interface DiffEngine {
  Diff_Timeout: number;
  diff_main(
    text1: string,
    text2: string,
    checklines?: boolean,
  ): Array<[number, string]>;
}

/**
 * Same engine node-dmp-cli v0.0.3 constructs:
 * `Diff_Timeout = 0` and `diff_main(text1, text2)` with checklines left at its default (true).
 * Do not remap astral characters. Do not run extra cleanup.
 */
export function createDiffEngine(): DiffEngine {
  const engine = new DiffMatchPatch() as DiffEngine;
  engine.Diff_Timeout = DIFF_TIMEOUT;
  return engine;
}

export function getDiffs(text1: string, text2: string): RawDiff[] {
  const engine = createDiffEngine();
  const diffs = engine.diff_main(text1, text2);
  return diffs.map(
    (diff) => [diff[0] as DiffOp, diff[1]] satisfies RawDiff,
  );
}
