import rulesRaw from "../../../samples/tibetan/rules.txt?raw";
import sourceRaw from "../../../samples/tibetan/source.txt?raw";
import targetRaw from "../../../samples/tibetan/target.txt?raw";

import { parsePatternFile } from "@/lib/patterns";

export interface SamplePair {
  source: string;
  sourceName: string;
  target: string;
  targetName: string;
  rules: [string, string][];
  rulesName: string;
}

export function loadSamplePair(): SamplePair {
  return {
    source: sourceRaw,
    sourceName: "sample-source.txt",
    target: targetRaw,
    targetName: "sample-target.txt",
    rules: parsePatternFile(rulesRaw),
    rulesName: "sample-rules.txt",
  };
}
