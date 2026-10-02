import type { RuleAnalysis } from "fast-antx-js";
import { describePattern } from "fast-antx-js";
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Download,
  HelpCircle,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { fill, type AppLabels } from "@/i18n";
import { ruleColor } from "@/lib/colors";
import { isBlankRule, type TransferRule } from "@/lib/patterns";
import type { PresetId } from "@/lib/presets";

interface TransferRulesPanelProps {
  labels: AppLabels;
  rules: TransferRule[];
  analysis: RuleAnalysis[] | null;
  hasSource: boolean;
  rulesFileName: string | null;
  rulesUploading: boolean;
  rulesError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onRulesUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onAddRule: () => void;
  onAddPreset: (id: PresetId) => void;
  onRemoveRule: (id: number) => void;
  onUpdateRule: (id: number, field: "type" | "regex", val: string) => void;
  onMoveRule: (id: number, direction: -1 | 1) => void;
  onSetMode: (id: number, mode: "keep" | "remove") => void;
  onShowInSource: (ruleIndex: number) => void;
}

const SMALL_BUTTON =
  "h-8 flex items-center gap-1.5 px-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const ICON_BUTTON =
  "w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:hover:text-muted-foreground transition-colors";

export function TransferRulesPanel({
  labels,
  rules,
  analysis,
  hasSource,
  rulesFileName,
  rulesUploading,
  rulesError,
  fileInputRef,
  onRulesUpload,
  onExport,
  onAddRule,
  onAddPreset,
  onRemoveRule,
  onUpdateRule,
  onMoveRule,
  onSetMode,
  onShowInSource,
}: TransferRulesPanelProps) {
  const exportable = rules.some((rule) => rule.type.trim() && rule.regex.trim());
  const activeCount = rules.filter((rule) => !isBlankRule(rule)).length;

  return (
    <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-hidden max-h-[45vh] lg:max-h-none">
      <div className="shrink-0 flex flex-col border-b border-border">
        <div className="min-h-11 flex items-center justify-between px-4 py-1.5 gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-foreground uppercase block leading-tight">
              {labels.transferRules}
            </span>
            {rulesFileName && (
              <span className="text-[10px] mono text-accent truncate block leading-tight mt-0.5">
                {rulesFileName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,text/plain,application/json"
              className="hidden"
              onChange={onRulesUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={rulesUploading}
              title={labels.importRulesTitle}
              className={SMALL_BUTTON}
            >
              {rulesUploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {labels.import}
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={!exportable}
              title={labels.exportRulesTitle}
              className={SMALL_BUTTON}
            >
              <Download size={12} />
              {labels.export}
            </button>
          </div>
        </div>
        {rulesError && (
          <div className="px-4 pb-2 text-xs text-destructive leading-snug">
            {rulesError}
          </div>
        )}
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
            {labels.addPreset}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <PresetChip
              label={labels.presetHfml}
              example={labels.presetHfmlCount}
              title={labels.presetHfmlHint}
              onClick={() => onAddPreset("hfml")}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 flex flex-col gap-2.5">
        {rules.map((rule, i) => (
          <RuleCard
            key={rule.id}
            labels={labels}
            rule={rule}
            index={i}
            total={rules.length}
            analysis={analysis?.[i] ?? null}
            hasSource={hasSource}
            onRemove={() => onRemoveRule(rule.id)}
            onUpdate={(field, val) => onUpdateRule(rule.id, field, val)}
            onMove={(direction) => onMoveRule(rule.id, direction)}
            onSetMode={(mode) => onSetMode(rule.id, mode)}
            onShowInSource={() => onShowInSource(i)}
          />
        ))}

        <button
          type="button"
          onClick={onAddRule}
          className="h-9 flex items-center justify-center gap-1.5 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground text-xs transition-colors"
        >
          <Plus size={12} /> {labels.addRule}
        </button>

        <details className="group border border-border bg-background/60 text-xs">
          <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <HelpCircle size={12} />
            <span>{labels.howRulesWork}</span>
            <ChevronDown
              size={12}
              className="ml-auto transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="px-3 pb-3 flex flex-col gap-2 text-muted-foreground leading-relaxed">
            <p>{labels.howKeep}</p>
            <p>{labels.howRemove}</p>
            <p>{labels.howOrder}</p>
          </div>
        </details>
      </div>

      <div className="h-8 shrink-0 border-t border-border flex items-center px-4">
        <p className="text-xs text-muted-foreground">
          {activeCount}{" "}
          {activeCount === 1 ? labels.ruleSingular : labels.rulePlural}
          {activeCount > 1 && <> · {labels.runTopToBottom}</>}
        </p>
      </div>
    </aside>
  );
}

function PresetChip({
  label,
  example,
  title,
  onClick,
}: {
  label: string;
  example: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-7 flex items-center gap-1.5 pl-2 pr-2.5 border border-border rounded-full text-xs text-foreground hover:border-foreground transition-colors"
    >
      <Plus size={11} className="text-muted-foreground" />
      <span>{label}</span>
      <span className="mono text-[10px] text-muted-foreground">{example}</span>
    </button>
  );
}

interface RuleCardProps {
  labels: AppLabels;
  rule: TransferRule;
  index: number;
  total: number;
  analysis: RuleAnalysis | null;
  hasSource: boolean;
  onRemove: () => void;
  onUpdate: (field: "type" | "regex", val: string) => void;
  onMove: (direction: -1 | 1) => void;
  onSetMode: (mode: "keep" | "remove") => void;
  onShowInSource: () => void;
}

function RuleCard({
  labels,
  rule,
  index,
  total,
  analysis,
  hasSource,
  onRemove,
  onUpdate,
  onMove,
  onSetMode,
  onShowInSource,
}: RuleCardProps) {
  const regex = rule.regex.trim();
  const type = rule.type.trim();
  const blank = !regex && !type;
  const description = describePattern(regex);
  const error = description.error ?? analysis?.error ?? null;
  const color = ruleColor(index);

  let status: { kind: "error" | "info" | "count"; text: string } | null = null;
  if (error) {
    status = { kind: "error", text: error };
  } else if (!blank && !type) {
    status = { kind: "error", text: labels.missingType };
  } else if (!blank && !regex) {
    status = { kind: "error", text: labels.missingRegex };
  } else if (regex && hasSource && analysis) {
    const count = analysis.count;
    if (count === 0) {
      status = { kind: "info", text: labels.noMatches };
    } else {
      const base = count === 1 ? labels.matchOne : fill(labels.matchMany, count.toLocaleString());
      status = {
        kind: "count",
        text:
          description.mode === "remove"
            ? `${base} · ${labels.deletedBeforeDiff}`
            : base,
      };
    }
  }

  const modeDisabled = !regex || Boolean(description.error) || description.mode === "custom";

  return (
    <div
      className="border border-border bg-background flex flex-col gap-2 p-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-6">
          {String(index + 1).padStart(2, "0")}
        </span>
        <input
          type="text"
          placeholder={labels.typePlaceholder}
          value={rule.type}
          onChange={(e) => onUpdate("type", e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
        />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          title={labels.moveUp}
          className={ICON_BUTTON}
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          title={labels.moveDown}
          className={ICON_BUTTON}
        >
          <ChevronDown size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={total === 1}
          title={labels.deleteRule}
          className={`${ICON_BUTTON} hover:text-destructive`}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <textarea
        placeholder={labels.regexPlaceholder}
        value={rule.regex}
        onChange={(e) => onUpdate("regex", e.target.value)}
        rows={2}
        spellCheck={false}
        className={`w-full bg-secondary text-xs text-foreground placeholder:text-muted-foreground/40 px-2.5 py-2 resize-none outline-none focus:ring-1 transition-shadow mono leading-relaxed ${
          status?.kind === "error" && error ? "ring-1 ring-destructive/60" : "focus:ring-accent"
        }`}
      />

      <div className="flex items-center justify-between gap-2">
        {description.mode === "custom" && regex && !description.error ? (
          <span
            className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 border border-border text-muted-foreground"
            title={labels.customGroupsHint}
          >
            {labels.customGroups}
          </span>
        ) : (
          <div
            className={`flex items-center border border-border ${
              modeDisabled ? "opacity-50" : ""
            }`}
          >
            {(["keep", "remove"] as const).map((mode) => {
              const active = !modeDisabled && description.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={modeDisabled}
                  onClick={() => onSetMode(mode)}
                  className={`h-7 px-3 text-xs transition-colors disabled:cursor-not-allowed ${
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        )}
        {status?.kind === "count" && (
          <button
            type="button"
            onClick={onShowInSource}
            title={labels.showInSource}
            className="h-7 flex items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Crosshair size={11} /> {labels.showInSource}
          </button>
        )}
      </div>

      {status && (
        <p
          className={`text-xs leading-snug ${
            status.kind === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {status.text}
        </p>
      )}
      {!error && description.mode === "custom" && regex && (
        <p className="text-xs leading-snug text-muted-foreground">
          {labels.customGroupsHint}
        </p>
      )}
      {!status && !regex && (
        <p className="text-xs leading-snug text-muted-foreground/70">
          {labels.modeHint}
        </p>
      )}
    </div>
  );
}
