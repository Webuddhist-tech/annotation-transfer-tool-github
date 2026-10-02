import { useCallback, useEffect, useState } from "react";

import type { UiLanguage } from "@/i18n/common";

const STORAGE_KEY = "webuddhsit_ui_language";

function getInitialLanguage(): UiLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "bo") return stored;
  return "en";
}

export function useUiLanguage() {
  const [language, setLanguageState] = useState<UiLanguage>(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === "bo" ? "bo" : "en";
  }, [language]);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "en" ? "bo" : "en"));
  }, []);

  return { language, setLanguage, toggleLanguage };
}
