export type UiLanguage = "en" | "bo";

export const commonLabels = {
  en: {
    languageLabel: "Language",
    english: "English",
    tibetan: "Tibetan",
    reset: "Reset",
    allTools: "All tools",
    home: "Home",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    brandSubtitle: "Webuddhist",
  },
  bo: {
    languageLabel: "སྐད་ཡིག",
    english: "English",
    tibetan: "བོད་ཡིག",
    reset: "བསྐྱར་སྒྲིག",
    allTools: "ལག་ཆ་ཚང་མ",
    home: "གཙོ་ངོས",
    darkMode: "ནག་པོའི་རི་མོ",
    lightMode: "དཀར་པོའི་རི་མོ",
    brandSubtitle: "Webuddhist",
  },
} as const;

export type CommonLabels = (typeof commonLabels)[UiLanguage];
