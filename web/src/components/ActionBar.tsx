import { ArrowRight, Loader2 } from "lucide-react";

import { fill, type AppLabels } from "@/i18n";
import type { TransferSummary } from "@/types";

export interface Readiness {
  needsSource: boolean;
  needsTarget: boolean;
  needsRule: boolean;
  /** 1-based indexes of rules that need fixing. */
  brokenRules: number[];
}

interface ActionBarProps {
  labels: AppLabels;
  readiness: Readiness;
  transferring: boolean;
  transferError: string | null;
  summary: TransferSummary | null;
  onTransfer: () => void;
  onShowMissing: (marker: { label: string; text: string }) => void;
}

export function describeReadiness(labels: AppLabels, r: Readiness): string | null {
  const parts: string[] = [];
  if (r.needsSource) parts.push(labels.needSource);
  if (r.needsTarget) parts.push(labels.needTarget);
  if (r.needsRule) parts.push(labels.needRule);
  if (r.brokenRules.length === 1) {
    parts.push(fill(labels.fixRule, String(r.brokenRules[0]).padStart(2, "0")));
  } else if (r.brokenRules.length > 1) {
    parts.push(
      fill(
        labels.fixRules,
        r.brokenRules.map((n) => String(n).padStart(2, "0")).join(", "),
      ),
    );
  }
  if (parts.length === 0) return null;
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} ${labels.and} ${parts[parts.length - 1]}`;
  return `${labels.toTransfer} ${list}.`;
}

export function ActionBar({
  labels,
  readiness,
  transferring,
  transferError,
  summary,
  onTransfer,
  onShowMissing,
}: ActionBarProps) {
  const blocker = describeReadiness(labels, readiness);
  const canTransfer = !blocker && !transferring;

  let message: React.ReactNode;
  let tone = "text-muted-foreground";
  if (transferError) {
    message = transferError;
    tone = "text-destructive";
  } else if (transferring) {
    message = labels.transferring;
  } else if (blocker) {
    message = blocker;
  } else if (summary) {
    if (summary.missing.length === 0) {
      message = labels.done;
      tone = "text-foreground";
    } else {
      message = (
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{fill(labels.doneMissing, summary.missing.length)}</span>
          {summary.missing.slice(0, 20).map((marker, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onShowMissing(marker)}
              className="mono text-[11px] px-1.5 py-0.5 border border-border hover:border-foreground text-foreground transition-colors"
              title={marker.label}
            >
              {marker.text}
            </button>
          ))}
        </span>
      );
      tone = "text-foreground";
    }
  } else {
    message = labels.ready;
    tone = "text-foreground";
  }

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 py-2.5 flex items-center justify-between gap-4">
      <div className={`text-xs leading-snug min-w-0 ${tone}`}>{message}</div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline text-[10px] mono text-muted-foreground border border-border px-1.5 py-0.5">
          {labels.shortcut}
        </span>
        <button
          type="button"
          onClick={onTransfer}
          disabled={!canTransfer}
          className="h-10 flex items-center gap-2 px-5 bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {transferring ? (
            <>
              <Loader2 size={14} className="animate-spin" /> {labels.transferring}
            </>
          ) : (
            <>
              {labels.transfer} <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
