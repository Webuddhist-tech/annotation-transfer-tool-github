import { useEffect } from "react";

export type Theme = "light" | "dark";

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  useEffect(() => {
    applyTheme("light");
  }, []);

  return { theme: "light" as const };
}
