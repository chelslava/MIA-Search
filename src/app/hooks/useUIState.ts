import { useState, useCallback } from "react";
import type { ContextMenuState } from "../types";

export function useUIState() {
  const [listHeight, setListHeight] = useState(460);
  const [scrollTop, setScrollTop] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeBg, setNewThemeBg] = useState("#1b1f2a");
  const [newThemeText, setNewThemeText] = useState("#e7edf8");
  const [newThemeAccent, setNewThemeAccent] = useState("#4a8cff");

  const requestClearHistory = useCallback(() => {
    setConfirmClearHistory(true);
  }, []);

  return {
    listHeight,
    setListHeight,
    scrollTop,
    setScrollTop,
    contextMenu,
    setContextMenu,
    historyOpen,
    setHistoryOpen,
    confirmClearHistory,
    setConfirmClearHistory,
    newProfileName,
    setNewProfileName,
    newThemeName,
    setNewThemeName,
    newThemeBg,
    setNewThemeBg,
    newThemeText,
    setNewThemeText,
    newThemeAccent,
    setNewThemeAccent,
    requestClearHistory
  };
}
