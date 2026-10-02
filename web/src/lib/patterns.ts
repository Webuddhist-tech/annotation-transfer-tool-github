export interface TransferRule {
  id: number;
  type: string;
  regex: string;
}

export function parsePatternFile(text: string): [string, string][] {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Pattern file is empty");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    try {
      parsed = JSON.parse(trimmed.replace(/'/g, '"'));
    } catch {
      throw new Error(
        'Invalid pattern file. Use JSON like [["pos", "(/.+? )"]] or fast-antx pattern.txt format.',
      );
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Pattern file must be a list of [type, regex] pairs");
  }

  const rules: [string, string][] = [];
  for (const item of parsed) {
    if (!Array.isArray(item) || item.length < 2) {
      throw new Error("Each rule must be [type, regex]");
    }
    const type = String(item[0]).trim();
    const regex = String(item[1]).trim();
    if (!type || !regex) {
      continue;
    }
    rules.push([type, regex]);
  }

  if (rules.length === 0) {
    throw new Error("No valid rules found in pattern file");
  }

  return rules;
}

export function rulesFromPairs(
  pairs: [string, string][],
  firstId = 1,
): TransferRule[] {
  return pairs.map(([type, regex], index) => ({
    id: firstId + index,
    type,
    regex,
  }));
}

/** The same JSON shape `parsePatternFile` reads, one pair per line. */
export function serializePatternFile(rules: TransferRule[]): string {
  const pairs = rules
    .filter((rule) => rule.type.trim() && rule.regex.trim())
    .map((rule) => [rule.type.trim(), rule.regex.trim()]);
  return `[\n${pairs.map((pair) => `  ${JSON.stringify(pair)}`).join(",\n")}\n]\n`;
}

/** A rule with neither field filled in. Ignored everywhere. */
export function isBlankRule(rule: TransferRule): boolean {
  return !rule.type.trim() && !rule.regex.trim();
}
