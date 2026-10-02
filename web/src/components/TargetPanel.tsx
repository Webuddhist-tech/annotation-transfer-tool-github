import { Check, Copy, Download, Loader2, Upload } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ResizablePanel } from "@/components/ui/resizable";
import type { AppLabels } from "@/i18n";
import type { ActiveTab } from "@/types";

interface TargetPanelProps {
  labels: AppLabels;
  activeTab: ActiveTab;
  beforeText: string;
  afterText: string;
  hasResult: boolean;
  targetFileName: string | null;
  busy: boolean;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onTabChange: (tab: ActiveTab) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFile: (file: File) => void;
  onDownloadAfter: () => void;
  onBeforeTextChange: (value: string) => void;
  onAfterTextChange: (value: string) => void;
  onClearError: () => void;
}

const TEXTAREA =
  "text-body w-full h-full px-5 py-3 bg-transparent resize-none text-foreground outline-none placeholder:text-muted-foreground/30 whitespace-pre-wrap break-words";

export function TargetPanel({
  labels,
  activeTab,
  beforeText,
  afterText,
  hasResult,
  targetFileName,
  busy,
  error,
  fileInputRef,
  onTabChange,
  onUpload,
  onDropFile,
  onDownloadAfter,
  onBeforeTextChange,
  onAfterTextChange,
  onClearError,
}: TargetPanelProps) {
  const [typing, setTyping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const showEditor = typing || beforeText.length > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(afterText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ResizablePanel
      defaultSize={50}
      minSize={15}
      className="flex flex-col min-h-0 overflow-hidden"
    >
      <div className="min-h-11 shrink-0 flex items-center justify-between gap-3 px-5 py-1.5 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-foreground uppercase shrink-0">
            {labels.target}
          </span>
          {activeTab === "before" && targetFileName ? (
            <span className="text-xs mono text-accent border border-accent/40 px-1.5 py-0.5 leading-none truncate">
              {targetFileName}
            </span>
          ) : activeTab === "before" ? (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {labels.targetHint}
            </span>
          ) : null}
          <div className="flex items-center ml-1 border border-border">
            {(["before", "after"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`h-7 px-3 text-xs flex items-center gap-1.5 transition-colors ${
                  activeTab === tab
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[tab]}
                {tab === "after" && !hasResult && (
                  <span className="text-[10px] opacity-70">· {labels.afterNotRun}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={onUpload}
          />
          {activeTab === "before" && showEditor && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="h-8 flex items-center gap-1.5 px-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {beforeText ? labels.replaceFile : labels.chooseFile}
            </button>
          )}
          {activeTab === "after" && (
            <>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!afterText}
                className="h-8 flex items-center gap-1.5 px-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? labels.copied : labels.copy}
              </button>
              <button
                type="button"
                onClick={onDownloadAfter}
                disabled={!afterText}
                className="h-8 flex items-center gap-1.5 px-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={12} /> {labels.download}
              </button>
            </>
          )}
        </div>
      </div>

      {error && activeTab === "before" && showEditor && (
        <div className="shrink-0 px-5 py-2 border-b border-destructive/30 bg-destructive/10 text-xs text-destructive">
          {error}
        </div>
      )}

      {activeTab === "before" ? (
        <div
          className={`flex-1 min-h-0 flex flex-col ${
            dragging ? "ring-2 ring-inset ring-accent" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragging) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onDropFile(file);
          }}
        >
          {showEditor ? (
            <textarea
              spellCheck={false}
              className={TEXTAREA}
              placeholder={labels.targetEmptyTitle}
              value={beforeText}
              onChange={(e) => {
                onBeforeTextChange(e.target.value);
                if (error) onClearError();
              }}
            />
          ) : (
            <EmptyState
              labels={labels}
              title={labels.targetEmptyTitle}
              body={labels.targetEmptyBody}
              busy={busy}
              error={error}
              onChooseFile={() => fileInputRef.current?.click()}
              onPasteText={onBeforeTextChange}
              onTypeInstead={() => setTyping(true)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <textarea
            spellCheck={false}
            className={TEXTAREA}
            placeholder={labels.afterPlaceholder}
            value={afterText}
            onChange={(e) => onAfterTextChange(e.target.value)}
          />
        </div>
      )}
    </ResizablePanel>
  );
}
