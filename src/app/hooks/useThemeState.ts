import { useState, useCallback, useMemo, useEffect } from "react";
import type { ThemePreset, ThemeColors } from "../types";
import { applyThemeColors, builtInThemes, darkenHex, tintHex } from "../theme";

type UseThemeStateResult = {
  themeId: string;
  setThemeId: React.Dispatch<React.SetStateAction<string>>;
  customThemes: ThemePreset[];
  setCustomThemes: React.Dispatch<React.SetStateAction<ThemePreset[]>>;
  activeTheme: ThemePreset;
  themeOptions: ThemePreset[];
  createCustomTheme: (name: string, bg: string, text: string, accent: string) => void;
};

export function useThemeState(tr: (key: string, defaultValue: string) => string): UseThemeStateResult {
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem("mia.theme") ?? "dark");
  const [customThemes, setCustomThemes] = useState<ThemePreset[]>(() => {
    try {
      const raw = localStorage.getItem("mia.customThemes");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ThemePreset[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const themeOptions = useMemo(() => {
    const systemTheme: ThemePreset = {
      id: "system",
      name: tr("app.themes.system", "Системная"),
      colors: builtInThemes[0].colors,
      builtIn: true
    };
    return [systemTheme].concat(builtInThemes, customThemes);
  }, [customThemes, tr]);

  const activeTheme = useMemo(() => {
    if (themeId === "system") {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
      return builtInThemes.find((theme) => theme.id === (prefersDark ? "dark" : "light")) ?? builtInThemes[0];
    }
    return themeOptions.find((theme) => theme.id === themeId) ?? builtInThemes[1];
  }, [themeId, themeOptions]);

  const createCustomTheme = useCallback((name: string, bg: string, text: string, accent: string) => {
    const id = `custom-${Date.now()}`;
    const theme: ThemePreset = {
      id,
      name,
      colors: {
        bg,
        surface: tintHex(bg, 0.08),
        surfaceAlt: tintHex(bg, 0.16),
        border: darkenHex(bg, 0.18),
        text,
        muted: darkenHex(text, 0.25),
        accent,
        accentSoft: tintHex(accent, 0.65)
      }
    };
    setCustomThemes((prev) => prev.concat(theme));
    setThemeId(id);
  }, []);

  useEffect(() => {
    localStorage.setItem("mia.theme", themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem("mia.customThemes", JSON.stringify(customThemes));
  }, [customThemes]);

  useEffect(() => {
    applyThemeColors(activeTheme.colors);
  }, [activeTheme]);

  return {
    themeId,
    setThemeId,
    customThemes,
    setCustomThemes,
    activeTheme,
    themeOptions,
    createCustomTheme
  };
}
