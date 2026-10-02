export type DiffOp = -1 | 0 | 1;

/** Raw diff-match-patch pair: [op, text]. */
export type RawDiff = [DiffOp, string];

/**
 * Filtered transfer record.
 * op -1 deletion, 0 equal or restored annotation, 1 insertion.
 * label is "" except on a restored annotation.
 */
export type DiffRecord = [DiffOp, string, string];

/** [label, regex]. A capturing group preserves; no group deletes. */
export type AnnotationPattern = [label: string, regex: string];

export type OutputFormat = "txt" | "yaml" | "diff";

/** Tofu character → [label, original matched text]. */
export type TofuMapping = Map<string, [string, string]>;
