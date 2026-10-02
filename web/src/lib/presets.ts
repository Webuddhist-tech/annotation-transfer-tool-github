import { HFML_ANN_PATTERN } from "fast-antx-js";

export type PresetId = "hfml";

export interface Preset {
  id: PresetId;
  /** Rules to add, in order. */
  rules: [string, string][];
}

export const PRESETS: Preset[] = [
  {
    id: "hfml",
    rules: HFML_ANN_PATTERN.map(([label, regex]) => [label, regex]),
  },
];
