import type { RuleAnalysis } from "fast-antx-js";
import { describePattern, toKeep, toRemove } from "fast-antx-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Columns2, Rows2 } from "lucide-react";

import { ActionBar, type Readiness } from "@/components/ActionBar";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { SourcePanel } from "@/components/SourcePanel";
import { TargetPanel } from "@/components/TargetPanel";
import { TransferRulesPanel } from "@/components/TransferRulesPanel";
import {
  ResizableHandle,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useUiLanguage } from "@/hooks/useUiLanguage";
import { translations } from "@/i18n";
import { analyzeRules, transferAnnotations } from "@/lib/client";
import { downloadTxtFile, readTxtFile } from "@/lib/files";
import {
  isBlankRule,
  parsePatternFile,
  rulesFromPairs,
  serializePatternFile,
  type TransferRule,
} from "@/lib/patterns";
import { PRESETS, type PresetId } from "@/lib/presets";
import { loadSamplePair } from "@/lib/sample";
import type {
  ActiveTab,
  Highlight,
  PanelLayout,
  TransferSummary,
  UploadPanel,
} from "@/types";

type FocusRequest = { start: number; end: number; nonce: number };

const ANALYZE_DEBOUNCE_MS = 300;

export function AnnotationTransferApp() {
  const { language, setLanguage } = useUiLanguage();
  const [panelLayout, setPanelLayout] = useState<PanelLayout>("horizontal");
  const labels = translations[language];

  const [sourceText, setSourceText] = useState("");
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("before");
  const [rules, setRules] = useState<TransferRule[]>([
    { id: 1, type: "", regex: "" },
  ]);
  const [analysis, setAnalysis] = useState<RuleAnalysis[] | null>(null);
  const [summary, setSummary] = useState<TransferSummary | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const [rulesFileName, setRulesFileName] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [targetFileName, setTargetFileName] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [uploadingPanel, setUploadingPanel] = useState<UploadPanel | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorPanel, setUploadErrorPanel] = useState<UploadPanel | null>(null);
  const [rulesUploading, setRulesUploading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const targetFileInputRef = useRef<HTMLInputElement>(null);
  const rulesFileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(2);
  const transferRef = useRef<() => void>(() => {});

  // ----- analysis (counts, spans, participation errors) -----

  useEffect(() => {
    const pairs = rules.map(
      (rule) => [rule.type.trim(), rule.regex.trim()] as [string, string],
    );
    const timer = window.setTimeout(() => {
      analyzeRules(sourceText, pairs)
        .then((result) => {
          if (result) setAnalysis(result);
        })
        .catch(() => setAnalysis(null));
    }, ANALYZE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [sourceText, rules]);

  const highlights = useMemo<Highlight[]>(() => {
    if (!analysis || analysis.length !== rules.length) return [];
    const result: Highlight[] = [];
    analysis.forEach((rule, index) => {
      if (rule.error) return;
      for (const [start, end] of rule.spans) {
        result.push({ start, end, color: index, removed: rule.mode === "remove" });
      }
    });
    return result;
  }, [analysis, rules.length]);

  // ----- readiness -----

  const readiness = useMemo<Readiness>(() => {
    const brokenRules: number[] = [];
    let completeRules = 0;
    rules.forEach((rule, index) => {
      if (isBlankRule(rule)) return;
      const type = rule.type.trim();
      const regex = rule.regex.trim();
      const description = regex ? describePattern(regex) : null;
      const analysisError =
        analysis && analysis.length === rules.length ? analysis[index].error : null;
      if (!type || !regex || description?.error || analysisError) {
        brokenRules.push(index + 1);
      } else {
        completeRules += 1;
      }
    });
    return {
      needsSource: !sourceText.trim(),
      needsTarget: !beforeText.trim(),
      needsRule: completeRules === 0 && brokenRules.length === 0,
      brokenRules,
    };
  }, [rules, analysis, sourceText, beforeText]);

  const canTransfer =
    !readiness.needsSource &&
    !readiness.needsTarget &&
    !readiness.needsRule &&
    readiness.brokenRules.length === 0 &&
    !transferring;

  // ----- file handling -----

  const loadFile = async (
    file: File,
    panel: UploadPanel,
    onLoad: (text: string, name: string) => void,
  ) => {
    setUploadingPanel(panel);
    setUploadError(null);
    setUploadErrorPanel(null);
    try {
      const { content, filename } = await readTxtFile(file);
      onLoad(content, filename);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : labels.uploadFailed);
      setUploadErrorPanel(panel);
    } finally {
      setUploadingPanel(null);
    }
  };

  const applySource = (text: string, name: string | null) => {
    setSourceText(text);
    setSourceFileName(name);
    setSummary(null);
  };

  const applyTarget = (text: string, name: string | null) => {
    setBeforeText(text);
    setTargetFileName(name);
    setSummary(null);
    setActiveTab("before");
  };

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void loadFile(file, "source", applySource);
  };

  const handleTargetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void loadFile(file, "target", applyTarget);
  };

  const handleRulesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setRulesUploading(true);
    setRulesError(null);
    try {
      const content = await file.text();
      const imported = rulesFromPairs(parsePatternFile(content));
      nextId.current = imported.length + 1;
      setRules(imported);
      setRulesFileName(file.name);
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : labels.rulesImportFailed);
    } finally {
      setRulesUploading(false);
    }
  };

  const handleExportRules = () => {
    const name = rulesFileName?.replace(/\.(txt|json)$/i, "") ?? "rules";
    downloadTxtFile(serializePatternFile(rules), `${name}.txt`);
  };

  const handleLoadSample = () => {
    const sample = loadSamplePair();
    applySource(sample.source, sample.sourceName);
    applyTarget(sample.target, sample.targetName);
    const imported = rulesFromPairs(sample.rules);
    nextId.current = imported.length + 1;
    setRules(imported);
    setRulesFileName(sample.rulesName);
    setAfterText("");
    setTransferError(null);
    setRulesError(null);
  };

  // ----- rules -----

  const touchRules = () => {
    if (rulesError) setRulesError(null);
    if (rulesFileName) setRulesFileName(null);
  };

  const addRule = () => {
    setRules((prev) => [...prev, { id: nextId.current++, type: "", regex: "" }]);
    touchRules();
  };

  const addPreset = (id: PresetId) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const added = rulesFromPairs(preset.rules, nextId.current);
    nextId.current += added.length;
    setRules((prev) => {
      const kept = prev.filter((rule) => !isBlankRule(rule));
      return [...kept, ...added];
    });
    touchRules();
  };

  const removeRule = (id: number) => {
    if (rules.length === 1) return;
    setRules((prev) => prev.filter((rule) => rule.id !== id));
    touchRules();
  };

  const updateRule = (id: number, field: "type" | "regex", val: string) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, [field]: val } : rule)),
    );
    touchRules();
  };

  const moveRule = (id: number, direction: -1 | 1) => {
    setRules((prev) => {
      const index = prev.findIndex((rule) => rule.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    touchRules();
  };

  const setRuleMode = (id: number, mode: "keep" | "remove") => {
    setRules((prev) =>
      prev.map((rule) => {
        if (rule.id !== id) return rule;
        const regex = rule.regex.trim();
        const next = mode === "keep" ? toKeep(regex) : toRemove(regex);
        return next === regex ? rule : { ...rule, regex: next };
      }),
    );
    touchRules();
  };

  const requestFocus = useCallback((start: number, end: number) => {
    setFocusRequest((prev) => ({ start, end, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const showRuleInSource = (ruleIndex: number) => {
    const span = analysis?.[ruleIndex]?.spans[0];
    if (span) requestFocus(span[0], span[1]);
  };

  const showMissingInSource = (marker: { label: string; text: string }) => {
    const index = sourceText.indexOf(marker.text);
    if (index !== -1) requestFocus(index, index + marker.text.length);
  };

  // ----- transfer -----

  const handleTransfer = async () => {
    if (!canTransfer) return;
    const patterns = rules
      .filter((rule) => rule.type.trim() && rule.regex.trim())
      .map((rule) => [rule.type.trim(), rule.regex.trim()] as [string, string]);

    setTransferring(true);
    setTransferError(null);
    try {
      const result = await transferAnnotations({
        source: sourceText,
        target: beforeText,
        patterns,
      });
      setAfterText(result.text);
      setSummary({ placed: result.placed, missing: result.missing });
      setActiveTab("after");
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : labels.transferFailed);
    } finally {
      setTransferring(false);
    }
  };
  transferRef.current = () => void handleTransfer();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        transferRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ----- reset -----

  const hasWork =
    Boolean(sourceText.trim()) ||
    Boolean(beforeText.trim()) ||
    Boolean(afterText.trim()) ||
    rules.some((rule) => !isBlankRule(rule)) ||
    Boolean(sourceFileName) ||
    Boolean(targetFileName) ||
    Boolean(rulesFileName);

  const handleReset = () => {
    if (transferring) return;
    setSourceText("");
    setBeforeText("");
    setAfterText("");
    setActiveTab("before");
    setSourceFileName(null);
    setTargetFileName(null);
    setRulesFileName(null);
    setRules([{ id: 1, type: "", regex: "" }]);
    nextId.current = 2;
    setAnalysis(null);
    setSummary(null);
    setFocusRequest(null);
    setTransferError(null);
    setUploadError(null);
    setUploadErrorPanel(null);
    setRulesError(null);
    setUploadingPanel(null);
    setRulesUploading(false);
    if (sourceFileInputRef.current) sourceFileInputRef.current.value = "";
    if (targetFileInputRef.current) targetFileInputRef.current.value = "";
    if (rulesFileInputRef.current) rulesFileInputRef.current.value = "";
  };

  const handleDownloadAfter = () => {
    if (!afterText.trim()) return;
    const baseName = targetFileName?.replace(/\.txt$/i, "") ?? "transfer-result";
    downloadTxtFile(afterText, `${baseName}-annotated.txt`);
  };

  const handleSourceTextChange = (value: string) => {
    setSourceText(value);
    if (!value.trim()) setSourceFileName(null);
    if (transferError) setTransferError(null);
    if (summary) setSummary(null);
  };

  const handleBeforeTextChange = (value: string) => {
    setBeforeText(value);
    if (!value.trim()) setTargetFileName(null);
    if (transferError) setTransferError(null);
    if (summary) setSummary(null);
  };

  const clearUploadError = () => {
    setUploadError(null);
    setUploadErrorPanel(null);
  };

  const toggleLayout = () => {
    setPanelLayout((layout) => (layout === "vertical" ? "horizontal" : "vertical"));
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      <AppHeader
        labels={labels}
        language={language}
        hasWork={hasWork}
        resetDisabled={transferring}
        showBack={false}
        onReset={handleReset}
        onLanguageChange={setLanguage}
        toolbarExtra={
          <button
            type="button"
            onClick={toggleLayout}
            title={
              panelLayout === "vertical" ? labels.switchToSideBySide : labels.switchToStacked
            }
            className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            {panelLayout === "vertical" ? <Columns2 size={13} /> : <Rows2 size={13} />}
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup
          key={panelLayout}
          direction={panelLayout}
          className="flex-1 min-w-0 min-h-0"
        >
          <SourcePanel
            labels={labels}
            panelLayout={panelLayout}
            sourceText={sourceText}
            sourceFileName={sourceFileName}
            busy={uploadingPanel === "source"}
            error={uploadErrorPanel === "source" ? uploadError : null}
            highlights={highlights}
            focusRequest={focusRequest}
            fileInputRef={sourceFileInputRef}
            onUpload={handleSourceUpload}
            onDropFile={(file) => void loadFile(file, "source", applySource)}
            onSourceTextChange={handleSourceTextChange}
            onLoadSample={handleLoadSample}
            onClearError={clearUploadError}
          />

          <ResizableHandle withHandle />

          <TargetPanel
            labels={labels}
            activeTab={activeTab}
            beforeText={beforeText}
            afterText={afterText}
            hasResult={summary !== null || afterText.length > 0}
            targetFileName={targetFileName}
            busy={uploadingPanel === "target"}
            error={uploadErrorPanel === "target" ? uploadError : null}
            fileInputRef={targetFileInputRef}
            onTabChange={setActiveTab}
            onUpload={handleTargetUpload}
            onDropFile={(file) => void loadFile(file, "target", applyTarget)}
            onDownloadAfter={handleDownloadAfter}
            onBeforeTextChange={handleBeforeTextChange}
            onAfterTextChange={setAfterText}
            onClearError={clearUploadError}
          />
        </ResizablePanelGroup>

        <TransferRulesPanel
          labels={labels}
          rules={rules}
          analysis={analysis && analysis.length === rules.length ? analysis : null}
          hasSource={Boolean(sourceText)}
          rulesFileName={rulesFileName}
          rulesUploading={rulesUploading}
          rulesError={rulesError}
          fileInputRef={rulesFileInputRef}
          onRulesUpload={(e) => void handleRulesUpload(e)}
          onExport={handleExportRules}
          onAddRule={addRule}
          onAddPreset={addPreset}
          onRemoveRule={removeRule}
          onUpdateRule={updateRule}
          onMoveRule={moveRule}
          onSetMode={setRuleMode}
          onShowInSource={showRuleInSource}
        />
      </div>

      <ActionBar
        labels={labels}
        readiness={readiness}
        transferring={transferring}
        transferError={transferError}
        summary={summary}
        onTransfer={() => void handleTransfer()}
        onShowMissing={showMissingInSource}
      />

      <AppFooter text={labels.footer} />
    </div>
  );
}
