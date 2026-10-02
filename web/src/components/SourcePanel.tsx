import { Loader2, Sparkles, Upload } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { HighlightedEditor } from "@/components/HighlightedEditor";
import { ResizablePanel } from "@/components/ui/resizable";
import type { AppLabels } from "@/i18n";
import type { Highlight, PanelLayout } from "@/types";

interface SourcePanelProps {
  labels: AppLabels;
  panelLayout: PanelLayout;
  sourceText: string;
  sourceFileName: string | null;
  busy: boolean;
  error: string | null;
  highlights: Highlight[];
  focusRequest: { start: number; end: number; nonce: number } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFile: (file: File) => void;
  onSourceTextChange: (value: string) => void;
  onLoadSample: () => void;
  onClearError: () => void;
}

export function SourcePanel({
  labels,
  panelLayout,
  sourceText,
  sourceFileName,
  busy,
  error,
  highlights,
  focusRequest,
  fileInputRef,
  onUpload,
  onDropFile,
  onSourceTextChange,
  onLoadSample,
  onClearError,
}: SourcePanelProps) {
  const [typing, setTyping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const showEditor = typing || sourceText.length > 0;

  return (
    <ResizablePanel
      defaultSize={50}
      minSize={15}
      className={`flex flex-col min-h-0 overflow-hidden ${
        panelLayout === "vertical" ? "border-b" : "border-r"
      } border-border`}
    >
      <div className="min-h-11 shrink-0 flex items-center justify-between gap-3 px-5 py-1.5 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-foreground uppercase shrink-0">
            {labels.source}
          </span>
          {sourceFileName ? (
            <span className="text-xs mono text-accent border border-accent/40 px-1.5 py-0.5 leading-none truncate">
              {sourceFileName}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate">
              {labels.sourceHint}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={onUpload}
          />
          {showEditor && (
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
              {sourceText ? labels.replaceFile : labels.chooseFile}
            </button>
          )}
        </div>
      </div>

      {error && showEditor && (
        <div className="shrink-0 px-5 py-2 border-b border-destructive/30 bg-destructive/10 text-xs text-destructive">
          {error}
        </div>
      )}

      <div
        className={`flex-1 min-h-0 flex flex-col relative ${
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
          <HighlightedEditor
            value={sourceText}
            placeholder={labels.sourceEmptyTitle}
            highlights={highlights}
            focusRequest={focusRequest}
            onChange={(value) => {
              onSourceTextChange(value);
              if (error) onClearError();
            }}
          />
        ) : (
          <EmptyState
            labels={labels}
            title={labels.sourceEmptyTitle}
            body={labels.sourceEmptyBody}
            busy={busy}
            error={error}
            onChooseFile={() => fileInputRef.current?.click()}
            onPasteText={onSourceTextChange}
            onTypeInstead={() => setTyping(true)}
            extra={
              <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center justify-center gap-1">
                <span>{labels.newHere}</span>
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="inline-flex items-center gap-1 text-accent hover:underline underline-offset-4"
                >
                  <Sparkles size={11} /> {labels.loadSample}
                </button>
                <span>— {labels.loadSampleSuffix}</span>
              </p>
            }
          />
        )}
      </div>
    </ResizablePanel>
  );
}
