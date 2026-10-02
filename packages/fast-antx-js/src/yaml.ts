import { stringify } from "yaml";

import type { DiffRecord } from "./types.js";

/**
 * Serialize filtered diffs as YAML 1.2.
 *
 * This is semantically compatible with `yaml.safe_dump(..., allow_unicode=True)`:
 * parsing the result yields the same `[op, text, label]` records.
 * It is not byte-identical to PyYAML 6.0.3. PyYAML folds newlines inside
 * single quotes and quotes YAML 1.1 booleans such as `yes` / `no`.
 * Existing fast-antx tests assert text output only, so byte identity is not
 * required. See the package README.
 */
export function toYaml(records: DiffRecord[]): string {
  return stringify(records, {
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
}
