import type { MissingMarker, RuleAnalysis } from "fast-antx-js";

export type RulePair = [label: string, regex: string];

export type WorkerRequest =
  | { id: number; kind: "analyze"; source: string; rules: RulePair[] }
  | {
      id: number;
      kind: "transfer";
      source: string;
      target: string;
      patterns: RulePair[];
    };

export type WorkerResponse =
  | { id: number; ok: true; kind: "analyze"; rules: RuleAnalysis[] }
  | {
      id: number;
      ok: true;
      kind: "transfer";
      text: string;
      placed: number;
      missing: MissingMarker[];
    }
  | { id: number; ok: false; error: string };
