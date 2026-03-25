import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

export type CommandPaletteAction = {
  id: string;
  label: string;
  run: () => void;
};

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
};

export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return actions;
    }

    return actions.filter((action) => action.label.toLowerCase().includes(normalizedQuery));
  }, [actions, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function runAction(action: CommandPaletteAction) {
    action.run();
    onClose();
    setQuery("");
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const firstAction = filteredActions[0];
    if (firstAction) {
      runAction(firstAction);
    }
  }

  return (
    <div className="command-palette" role="dialog" aria-modal="true" aria-label={t("commandPalette.ariaLabel")}>
      <div className="command-palette__backdrop" onClick={onClose} />
      <div className="command-palette__panel">
        <div className="command-palette__header">
          <label className="command-palette__label" htmlFor="command-palette-input">
            {t("commandPalette.title")}
          </label>
          <input
            id="command-palette-input"
            ref={inputRef}
            className="command-palette__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("commandPalette.placeholder")}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="command-palette__results" role="list" aria-label={t("commandPalette.resultsLabel")}>
          {filteredActions.length > 0 ? (
            filteredActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="command-palette__item"
                role="listitem"
                onClick={() => runAction(action)}
              >
                {action.label}
              </button>
            ))
          ) : (
            <div className="command-palette__empty">{t("commandPalette.emptyState")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
