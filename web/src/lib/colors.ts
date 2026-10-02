/** One color per rule, cycling. Teal and violet first to match the brand. */
export const RULE_COLORS = [
  "#22cfe0",
  "#8b50e8",
  "#e0a022",
  "#2fb36b",
  "#e05a8a",
  "#4a7be0",
] as const;

export function ruleColor(index: number): string {
  return RULE_COLORS[index % RULE_COLORS.length];
}

export function ruleBackground(index: number, alpha = 0.28): string {
  const hex = ruleColor(index);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
