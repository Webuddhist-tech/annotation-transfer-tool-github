import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { toYaml } from "../src/yaml";
import type { DiffRecord } from "../src/types";

describe("toYaml", () => {
  const records: DiffRecord[] = [
    [0, "[1a]", "pages"],
    [0, "Hello\nWorld", ""],
    [1, "༄༅། །མདོ", ""],
    [0, "", ""],
    [0, "yes", ""],
    [0, "true", ""],
    [0, "n: v", ""],
  ];

  it("round-trips the same records, including Tibetan, empties, and newlines", () => {
    const yaml = toYaml(records);
    expect(yaml.startsWith("---")).toBe(false);
    expect(yaml).toContain("༄༅");
    expect(parse(yaml)).toEqual(records);
    expect(parse(toYaml([]))).toEqual([]);
  });

  it("keeps a stable document", () => {
    expect(toYaml(records)).toMatchInlineSnapshot(`
      "- - 0
        - "[1a]"
        - pages
      - - 0
        - |-
          Hello
          World
        - ""
      - - 1
        - ༄༅། །མདོ
        - ""
      - - 0
        - ""
        - ""
      - - 0
        - yes
        - ""
      - - 0
        - "true"
        - ""
      - - 0
        - "n: v"
        - ""
      "
    `);
  });
});
