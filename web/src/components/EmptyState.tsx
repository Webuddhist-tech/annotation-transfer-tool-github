import { ClipboardPaste, FileText, Loader2, Upload } from "lucide-react";
import { useState } from "react";

import type { AppLabels } from "@/i18n";

interface EmptyStateProps {
  labels: AppLabels;
  title: string;
  body: string;
  busy: boolean;
  error: string | null;
  onChooseFile: () => void;
  onPasteText: (text: string) => void;
  onTypeInstead: () => void;
  /** Rendered under the buttons, e.g. the sample link. */
  extra?: React.ReactNode;
}

export function EmptyState({
  labels,
  title,
  body,
  busy,
  error,
  onChooseFile,
  onPasteText,
  onTypeInstead,
  extra,
}: EmptyStateProps) {
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handlePaste = async () => {
    setPasteError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error("empty");
      onPasteText(text);
    } catch {
      setPasteError(labels.pasteFailed);
      onTypeInstead();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-dashed border-border rounded-lg px-6 py-8 flex flex-col items-center text-center gap-4 bg-card/40">
        <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground">
          <FileText size={18} />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onChooseFile}
            disabled={busy}
            className="h-9 flex items-center gap-2 px-3.5 border border-border text-foreground hover:border-foreground text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            {busy ? labels.uploading : labels.chooseFile}
          </button>
          <button
            type="button"
            onClick={() => void handlePaste()}
            disabled={busy}
            className="h-9 flex items-center gap-2 px-3.5 border border-border text-foreground hover:border-foreground text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ClipboardPaste size={13} />
            {labels.pasteFromClipboard}
          </button>
        </div>
        <button
          type="button"
          onClick={onTypeInstead}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {labels.typeInstead}
        </button>
        {(error || pasteError) && (
          <p className="text-xs text-destructive">{error ?? pasteError}</p>
        )}
        {extra}
      </div>
    </div>
  );
}
