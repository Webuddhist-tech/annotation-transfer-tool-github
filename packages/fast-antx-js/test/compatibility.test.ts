import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { HFML_ANN_PATTERN } from "../src/patterns";
import { transfer } from "../src/transfer";
import type { AnnotationPattern, DiffRecord } from "../src/types";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/annotation-transfer.json", import.meta.url), "utf8"),
) as {
  source_text: string;
  target_text: string;
  expected: string;
  annotation_patterns: AnnotationPattern[];
};

describe("Python golden tests", () => {
  it("transfers page markers and deletes line markers on the Tibetan fixture", () => {
    const annotated = transfer(
      fixture.source_text,
      fixture.annotation_patterns,
      fixture.target_text,
      "txt",
    );
    expect(annotated).toBe(fixture.expected);
  });

  it("matches diff records and yaml data for that fixture", () => {
    const diff = transfer(
      fixture.source_text,
      fixture.annotation_patterns,
      fixture.target_text,
      "diff",
    ) as DiffRecord[];
    const yaml = transfer(
      fixture.source_text,
      fixture.annotation_patterns,
      fixture.target_text,
      "yaml",
    );
    expect(parse(String(yaml))).toEqual(diff);
    expect(transfer(
      fixture.source_text,
      fixture.annotation_patterns,
      fixture.target_text,
      "txt",
    )).toBe(fixture.expected);
    expect(diff.some((row) => row[2] === "pages")).toBe(true);
    expect(diff.some((row) => row[1].includes("[1a.1]"))).toBe(false);
  });

  it("applies HFML patterns across three sequential transfers", () => {
    const id = String.fromCodePoint(0x493e0);
    const layers = [
      `<${id}k1ཀཀཀཀ>\n ཁཁཁཁ`,
      `ཀཀཀཀ\n <${id}auཁཁཁཁ>`,
      `ཀཀཀཀ\n ཁཁཁཁ\n <${id}gགགགg>`,
    ];
    let base = "ཀཀཀ\n ཁཁཁ\n གགགག";
    const expected = `<${id}k1ཀཀཀ>\n <${id}auཁཁཁ>\n <${id}gགགགགg>`;

    for (const layer of layers) {
      base = transfer(layer, HFML_ANN_PATTERN, base, "txt") as string;
    }

    expect(base).toBe(expected);
  });
});
