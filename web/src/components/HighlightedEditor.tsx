import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ruleBackground, ruleColor } from "@/lib/colors";
import type { Highlight } from "@/types";

/** Above this size the overlay is skipped and the plain textarea is shown. */
export const HIGHLIGHT_LIMIT = 500_000;
const MAX_MARKS = 8000;

interface HighlightedEditorProps {
  value: string;
  placeholder: string;
  highlights: Highlight[];
  /** Change to scroll the matching region into view. */
  focusRequest: { start: number; end: number; nonce: number } | null;
  onChange: (value: string) => void;
}

type Segment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; color: number; removed: boolean; start: number };

function buildSegments(value: string, highlights: Highlight[]): Segment[] {
  const sorted = [...highlights].sort((a, b) => a.start - b.start).slice(0, MAX_MARKS);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.start < cursor || h.end <= h.start) continue;
    if (h.start > cursor) {
      segments.push({ kind: "text", text: value.slice(cursor, h.start) });
    }
    segments.push({
      kind: "mark",
      text: value.slice(h.start, h.end),
      color: h.color,
      removed: h.removed,
      start: h.start,
    });
    cursor = h.end;
  }
  if (cursor < value.length) {
    segments.push({ kind: "text", text: value.slice(cursor) });
  }
  return segments;
}

const SHARED =
  "text-body w-full h-full px-5 py-3 whitespace-pre-wrap break-words m-0 border-0";

const TIBETAN = /[\u0F00-\u0FFF]/;

function markStyle(color: number, removed: boolean, trim: number): React.CSSProperties {
  const fill = ruleBackground(color, removed ? 0.14 : 0.3);
  const line = ruleColor(color);
  const top = `${trim}px`;
  const bottom = `calc(100% - ${trim}px)`;
  const underline = `calc(100% - ${trim + 2}px)`;
  return {
    backgroundColor: "transparent",
    backgroundImage: `linear-gradient(to bottom, transparent ${top}, ${fill} ${top}, ${fill} ${underline}, ${line} ${underline}, ${line} ${bottom}, transparent ${bottom})`,
    textDecoration: removed ? "line-through" : "none",
    textDecorationColor: line,
    textDecorationThickness: "2px",
  };
}

export function HighlightedEditor({
  value,
  placeholder,
  highlights,
  focusRequest,
  onChange,
}: HighlightedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const latinProbeRef = useRef<HTMLSpanElement>(null);
  const tibetanProbeRef = useRef<HTMLSpanElement>(null);
  // The Tibetan font has a content area much taller than the line box, the
  // Latin font a shorter one. An inline background covers the content area, so
  // it is drawn as a gradient trimmed by the overshoot measured on two probes:
  // one for marks in Latin script, one for marks containing Tibetan.
  const [trim, setTrim] = useState({ latin: 0, tibetan: 0 });

  const overlayEnabled = value.length <= HIGHLIGHT_LIMIT && highlights.length > 0;

  useLayoutEffect(() => {
    if (!overlayEnabled) return;
    let cancelled = false;
    const overshoot = (probe: HTMLElement | null) => {
      if (!probe) return 0;
      const contentHeight = probe.getBoundingClientRect().height;
      const lineHeight = parseFloat(getComputedStyle(probe).lineHeight);
      if (!Number.isFinite(contentHeight) || !Number.isFinite(lineHeight)) return 0;
      return Math.max(0, (contentHeight - lineHeight) / 2);
    };
    const measure = () => {
      if (cancelled) return;
      setTrim({
        latin: overshoot(latinProbeRef.current),
        tibetan: overshoot(tibetanProbeRef.current),
      });
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [overlayEnabled]);
  const segments = useMemo(
    () => (overlayEnabled ? buildSegments(value, highlights) : []),
    [overlayEnabled, value, highlights],
  );

  const syncScroll = () => {
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (!ta || !bd) return;
    bd.scrollTop = ta.scrollTop;
    bd.scrollLeft = ta.scrollLeft;
  };

  useEffect(() => {
    if (!focusRequest) return;
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (!ta) return;
    const mark = bd?.querySelector<HTMLElement>(
      `[data-start="${focusRequest.start}"]`,
    );
    if (mark && bd) {
      const top = mark.offsetTop - bd.clientHeight / 2;
      ta.scrollTop = Math.max(0, top);
      syncScroll();
    } else {
      // No overlay: approximate from the line the span starts on.
      const line = value.slice(0, focusRequest.start).split("\n").length - 1;
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24;
      ta.scrollTop = Math.max(0, line * lineHeight - ta.clientHeight / 2);
    }
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(focusRequest.start, focusRequest.end);
  }, [focusRequest]);

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      {overlayEnabled && (
        <div
          ref={backdropRef}
          aria-hidden
          className={`${SHARED} absolute inset-0 overflow-hidden text-transparent pointer-events-none select-none`}
        >
          {segments.map((segment, i) =>
            segment.kind === "text" ? (
              <span key={i}>{segment.text}</span>
            ) : (
              <mark
                key={i}
                data-start={segment.start}
                className="text-transparent"
                style={markStyle(
                  segment.color,
                  segment.removed,
                  TIBETAN.test(segment.text) ? trim.tibetan : trim.latin,
                )}
              >
                {segment.text}
              </mark>
            ),
          )}
          {/* Trailing newline keeps the backdrop as tall as the textarea. */}
          {"\n"}
          <span ref={latinProbeRef} aria-hidden className="invisible">
            x
          </span>
          <span ref={tibetanProbeRef} aria-hidden className="invisible">
            ཀ
          </span>
        </div>
      )}
      <textarea
        ref={textareaRef}
        spellCheck={false}
        className={`${SHARED} absolute inset-0 bg-transparent resize-none text-foreground outline-none placeholder:text-muted-foreground/30 overflow-auto`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
      />
    </div>
  );
}
