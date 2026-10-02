import { ArrowLeft, RotateCcw, ShieldCheck } from "lucide-react";

import { OPENPECHA_LOGO } from "@/brand";
import type { CommonLabels, UiLanguage } from "@/i18n/common";

export const HOME_PATH = import.meta.env.BASE_URL;

export type HeaderLabels = CommonLabels & {
  appTitle: string;
  appSubtitle: string;
  privacyLine: string;
  resetTitle: string;
};

interface AppHeaderProps {
  labels: HeaderLabels;
  language: UiLanguage;
  hasWork: boolean;
  resetDisabled?: boolean;
  showBack?: boolean;
  onReset: () => void;
  onLanguageChange: (language: UiLanguage) => void;
  toolbarExtra?: React.ReactNode;
}

export function AppHeader({
  labels,
  language,
  hasWork,
  resetDisabled = false,
  showBack = true,
  onReset,
  onLanguageChange,
  toolbarExtra,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 min-h-14 shrink-0 border-b border-border px-4 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-card/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        {showBack ? (
          <a
            href={HOME_PATH}
            title={labels.allTools}
            aria-label={labels.allTools}
            className="flex items-center justify-center h-8 w-8 shrink-0 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <ArrowLeft size={14} />
          </a>
        ) : null}
        <a href={HOME_PATH} className="shrink-0" title={labels.home}>
          <img
            src={OPENPECHA_LOGO}
            alt="OpenPecha logo"
            className="h-9 w-9 rounded-xl object-cover shadow-[0_0_18px_rgba(34,211,238,0.35)] dark:shadow-[0_0_18px_rgba(34,207,224,0.25)]"
          />
        </a>
        <div className="flex flex-col leading-none min-w-0">
          <span className="text-[11px] tracking-[0.12em] uppercase text-foreground font-semibold leading-snug truncate">
            {labels.appTitle}
          </span>
          <span className="mt-1 text-[10px] tracking-[0.18em] uppercase text-accent font-medium truncate">
            {labels.appSubtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck size={13} className="text-accent" />
          {labels.privacyLine}
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={resetDisabled || !hasWork}
          title={labels.resetTitle}
          className="h-8 flex items-center gap-1.5 px-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <RotateCcw size={12} /> {labels.reset}
        </button>
        {toolbarExtra}
        <div
          role="radiogroup"
          aria-label={labels.languageLabel}
          className="h-8 flex items-center border border-border rounded"
        >
          {(["en", "bo"] as const).map((lang) => {
            const active = language === lang;
            return (
              <button
                key={lang}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onLanguageChange(lang)}
                title={lang === "en" ? labels.english : labels.tibetan}
                className={`h-full px-2.5 text-[11px] font-medium leading-none transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "en" ? "EN" : "བོད"}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
