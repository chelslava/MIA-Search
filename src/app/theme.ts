import type { ThemeColors, ThemePreset } from "./types";

export const builtInThemes: ThemePreset[] = [
  {
    id: "light",
    name: "Светлая",
    builtIn: true,
    colors: {
      bg: "#ffffff",
      surface: "#f8fafc",
      surfaceAlt: "#eef2f7",
      border: "#d7dee8",
      text: "#11181C",
      muted: "#526173",
      accent: "#0F67FF",
      accentSoft: "#dce8ff"
    }
  },
  {
    id: "dark",
    name: "Темная",
    builtIn: true,
    colors: {
      bg: "#0F0F12",
      surface: "#171a21",
      surfaceAlt: "#1f2430",
      border: "#303846",
      text: "#EDEDED",
      muted: "#A3ADBC",
      accent: "#3B82F6",
      accentSoft: "#1e355d"
    }
  },
  {
    id: "sepia",
    name: "Сепия",
    builtIn: true,
    colors: {
      bg: "#FBF5E8",
      surface: "#f2e7d1",
      surfaceAlt: "#ead9bb",
      border: "#d4bea0",
      text: "#3A2C1F",
      muted: "#6f5841",
      accent: "#C37B2E",
      accentSoft: "#f2ddc4"
    }
  },
  {
    id: "aquamarine",
    name: "Аквамарин",
    builtIn: true,
    colors: {
      bg: "#EFF7F6",
      surface: "#e0f0ed",
      surfaceAlt: "#d2e8e4",
      border: "#b2d1cb",
      text: "#1E3B3A",
      muted: "#4f6f6d",
      accent: "#2D9C7C",
      accentSoft: "#c9ebe1"
    }
  },
  {
    id: "night-blue",
    name: "Ночная синь",
    builtIn: true,
    colors: {
      bg: "#111122",
      surface: "#171a31",
      surfaceAlt: "#1e2342",
      border: "#2c3460",
      text: "#E0E4F0",
      muted: "#98a3c3",
      accent: "#6C8EFF",
      accentSoft: "#283666"
    }
  }
];

export function tintHex(hex: string, ratio: number): string {
  const valid = /^#?[0-9A-Fa-f]{6}$/.test(hex);
  if (!valid) return "#808080";
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const blend = (value: number) => Math.max(0, Math.min(255, Math.round(value + (255 - value) * ratio)));
  return `#${[blend(r), blend(g), blend(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function darkenHex(hex: string, ratio: number): string {
  const valid = /^#?[0-9A-Fa-f]{6}$/.test(hex);
  if (!valid) return "#303030";
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const blend = (value: number) => Math.max(0, Math.min(255, Math.round(value * (1 - ratio))));
  return `#${[blend(r), blend(g), blend(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function applyThemeColors(colors: ThemeColors): void {
  const root = document.documentElement;
  root.style.setProperty("--bg", colors.bg);
  root.style.setProperty("--surface", colors.surface);
  root.style.setProperty("--surface-alt", colors.surfaceAlt);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-soft", colors.accentSoft);
}
