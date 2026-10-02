export type PanelLayout = "vertical" | "horizontal";
export type ActiveTab = "before" | "after";
export type UploadPanel = "source" | "target";
export type Language = "en" | "bo";

/** One highlighted region of the source, in UTF-16 offsets. */
export interface Highlight {
  start: number;
  end: number;
  /** Index into the rule color palette. */
  color: number;
  /** Struck through when the rule is Remove. */
  removed: boolean;
}

export interface TransferSummary {
  placed: number;
  missing: { label: string; text: string }[];
}
