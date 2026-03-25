import type { SearchResultItem } from "../shared/search-types";

export type RootItem = { path: string; enabled: boolean };

export type DisplayMode = "table" | "compact" | "cards";

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
};

export type ThemePreset = { id: string; name: string; colors: ThemeColors; builtIn?: boolean };

export type ContextMenuState =
  | { type: "result"; x: number; y: number; item: SearchResultItem }
  | { type: "root"; x: number; y: number; path: string }
  | null;

export type FilterChip = { id: string; label: string; remove: () => void };
