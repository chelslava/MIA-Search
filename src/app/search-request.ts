import type { EntryKind, MatchMode, SearchRequest, SizeComparison, SortMode } from "../shared/search-types";
import { toIsoOrNull } from "./formatters";

type BuildSearchRequestInput = {
  query: string;
  enabledRoots: string[];
  primaryRoot: string;
  extensionsRaw: string;
  maxDepthUnlimited: boolean;
  maxDepth: number;
  limit: number | null;
  strict: boolean;
  ignoreCase: boolean;
  includeHidden: boolean;
  entryKind: EntryKind;
  sizeFilterEnabled: boolean;
  sizeComparison: SizeComparison;
  sizeValue: number;
  sizeUnit: "B" | "KB" | "MB" | "GB" | "TB";
  modifiedFilterEnabled: boolean;
  modifiedAfter: string;
  modifiedBefore: string;
  createdFilterEnabled: boolean;
  createdAfter: string;
  createdBefore: string;
  sortMode: SortMode;
};

const sizeUnitMultipliers: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4
};

type ParsedQueryCommands = {
  query: string;
  matchMode: MatchMode;
  strict?: boolean;
  ignoreCase?: boolean;
  includeHidden?: boolean;
  entryKind?: EntryKind;
  extensions: string[];
};

function parseQueryCommands(rawQuery: string): ParsedQueryCommands {
  let text = rawQuery.trim();
  let matchMode: MatchMode = "Plain";
  let strict: boolean | undefined;
  let ignoreCase: boolean | undefined;
  let includeHidden: boolean | undefined;
  let entryKind: EntryKind | undefined;
  const extensions = new Set<string>();

  const prefixedModes: Array<{ prefixes: string[]; mode: MatchMode }> = [
    { prefixes: ["regex:", "re:"], mode: "Regex" },
    { prefixes: ["wildcard:", "wc:"], mode: "Wildcard" },
    { prefixes: ["plain:", "p:"], mode: "Plain" }
  ];

  for (const item of prefixedModes) {
    const matchedPrefix = item.prefixes.find((prefix) => text.toLowerCase().startsWith(prefix));
    if (matchedPrefix) {
      matchMode = item.mode;
      text = text.slice(matchedPrefix.length).trim();
      break;
    }
  }

  const tokens = text ? text.split(/\s+/) : [];
  const kept: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === "/re" || lower === "/regex") {
      matchMode = "Regex";
      continue;
    }
    if (lower === "/wc" || lower === "/wildcard") {
      matchMode = "Wildcard";
      continue;
    }
    if (lower === "/plain") {
      matchMode = "Plain";
      continue;
    }
    if (lower === "/case") {
      ignoreCase = false;
      continue;
    }
    if (lower === "/nocase") {
      ignoreCase = true;
      continue;
    }
    if (lower === "/strict") {
      strict = true;
      continue;
    }
    if (lower === "/loose") {
      strict = false;
      continue;
    }
    if (lower === "/files") {
      entryKind = "File";
      continue;
    }
    if (lower === "/folders" || lower === "/dirs") {
      entryKind = "Directory";
      continue;
    }
    if (lower === "/all") {
      entryKind = "Any";
      continue;
    }
    if (lower === "/hidden") {
      includeHidden = true;
      continue;
    }
    if (lower === "/nohidden") {
      includeHidden = false;
      continue;
    }
    if (lower.startsWith("ext:")) {
      lower
        .slice(4)
        .split(",")
        .map((value) => value.trim().replace(/^\./, ""))
        .filter(Boolean)
        .forEach((ext) => extensions.add(ext));
      continue;
    }
    kept.push(token);
  }

  return {
    query: kept.join(" ").trim(),
    matchMode,
    strict,
    ignoreCase,
    includeHidden,
    entryKind,
    extensions: Array.from(extensions)
  };
}

export function buildSearchRequest(input: BuildSearchRequestInput): SearchRequest {
  const fallbackRoot =
    typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent) ? "C:\\" : "/";
  const createdAfterIso = input.createdFilterEnabled ? toIsoOrNull(input.createdAfter) : null;
  const createdBeforeIso = input.createdFilterEnabled ? toIsoOrNull(input.createdBefore) : null;
  const modifiedAfterIso = input.modifiedFilterEnabled ? toIsoOrNull(input.modifiedAfter) : null;
  const modifiedBeforeIso = input.modifiedFilterEnabled ? toIsoOrNull(input.modifiedBefore) : null;
  const parsed = parseQueryCommands(input.query);
  const uiExtensions = input.extensionsRaw
    .split(",")
    .map((value) => value.trim().replace(/^\./, ""))
    .filter(Boolean);
  const mergedExtensions = Array.from(new Set([...uiExtensions, ...parsed.extensions]));

  return {
    query: parsed.query,
    roots: input.enabledRoots.length > 0 ? input.enabledRoots : [input.primaryRoot || fallbackRoot],
    extensions: mergedExtensions,
    options: {
      max_depth: input.maxDepthUnlimited ? null : input.maxDepth,
      limit: input.limit,
      strict: parsed.strict ?? input.strict,
      ignore_case: parsed.ignoreCase ?? input.ignoreCase,
      include_hidden: parsed.includeHidden ?? input.includeHidden,
      entry_kind: parsed.entryKind ?? input.entryKind,
      match_mode: parsed.matchMode,
      size_filter: input.sizeFilterEnabled
        ? {
            comparison: input.sizeComparison,
            bytes: Math.max(0, input.sizeValue) * sizeUnitMultipliers[input.sizeUnit]
          }
        : null,
      created_filter: createdAfterIso
        ? { field: "Created", comparison: "After", value: createdAfterIso }
        : createdBeforeIso
          ? { field: "Created", comparison: "Before", value: createdBeforeIso }
          : null,
      modified_filter: modifiedAfterIso
        ? { field: "Modified", comparison: "After", value: modifiedAfterIso }
        : modifiedBeforeIso
          ? { field: "Modified", comparison: "Before", value: modifiedBeforeIso }
          : null,
      sort_mode: input.sortMode
    }
  };
}
