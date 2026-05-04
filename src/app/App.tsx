import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CommandPalette } from "../widgets/CommandPalette";
import { ToastHost } from "../widgets/ToastHost";
import { AppContextMenu } from "./components/chrome/AppContextMenu";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FiltersPanel } from "./components/chrome/FiltersPanel";
import { SettingsPanel } from "./components/chrome/SettingsPanel";
import { StatusBar } from "./components/chrome/StatusBar";
import { TopBar } from "./components/chrome/TopBar";
import { ResultsWorkspace } from "./components/results/ResultsWorkspace";
import { DetailsSidebar } from "./components/sidebars/DetailsSidebar";
import { LeftSidebar } from "./components/sidebars/LeftSidebar";
import { formatBytes, formatDate } from "./formatters";
import { applyThemeColors, darkenHex, tintHex } from "./theme";
import type { AppLanguage } from "./components/chrome/props";
import { useApp, useKeyboardShortcuts } from "./hooks";
import { RESPONSIVE_BREAKPOINT } from "./utils/search-utils";
import "./styles.css";

export function App() {
  const {
    tr,
    language,
    searchState,
    themeState,
    persistence,
    filesystemTree,
    filterState,
    settingsState,
    layoutState,
    roots,
    upsertRoot,
    index,
    indexRoots,
    handleCancelRebuild,
    toasts,
    closeToast,
    uiState,
    query,
    setQuery,
    handleSearch,
    handleCancel,
    handleOpenPath,
    handleOpenParent,
    handleRevealPath,
    handleCopyPath,
    handleCopyName,
    handleAddFavorite,
    handleRemoveFavorite,
    handleSaveProfile,
    handleDeleteProfile,
    handleClearHistory,
    handlePickRootPath,
    handleRemoveRoot,
    applyProfile,
    requestClearHistory,
    selectedResult,
    chips,
    visibleRows,
    statusText,
    commandActions,
    confirmClearHistory,
    setConfirmClearHistory,
    searchInputRef,
    resultPaneRef,
  } = useApp();

  const appLanguage: AppLanguage = language === "en" ? "en" : "ru";

  const { i18n } = useTranslation();

  const indexUpdatedAtLabel = useMemo(() => {
    if (!index.indexStatusSnapshot?.updated_at) return "-";
    return formatDate(index.indexStatusSnapshot.updated_at);
  }, [index.indexStatusSnapshot]);

  useEffect(() => {
    applyThemeColors(themeState.activeTheme.colors);
  }, [themeState.activeTheme]);

  useEffect(() => {
    if (window.innerWidth < RESPONSIVE_BREAKPOINT) {
      layoutState.setLeftVisible(false);
      layoutState.setRightVisible(false);
    }
  }, [layoutState]);

  useKeyboardShortcuts({
    isSearching: searchState.isSearching,
    results: searchState.results,
    selectedPath: searchState.selectedPath,
    selectedResult,
    searchBackend: filterState.searchBackend,
    indexRoots,
    isRebuildingIndex: index.isRebuildingIndex,
    onSearch: () => void handleSearch(),
    onRebuildIndex: () => void index.handleRebuildIndex(indexRoots),
    onOpenPath: (path) => void handleOpenPath(path),
    onOpenParent: (path) => void handleOpenParent(path),
    onSelectPath: searchState.setSelectedPath,
    onOpenCommandPalette: () => layoutState.setPaletteOpen(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onCloseModals: () => {
      layoutState.setFiltersOpen(false);
      layoutState.setSettingsOpen(false);
    },
  });

  return (
    <>
      <main className="app">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          regexEnabled={settingsState.regexEnabled}
          onClearQuery={() => setQuery("")}
          searchInputRef={searchInputRef}
          isSearching={searchState.isSearching}
          onSearch={() => void handleSearch()}
          onCancelSearch={() => void handleCancel()}
          matchMode={filterState.matchMode}
          onMatchModeChange={filterState.setMatchMode}
          entryKind={filterState.entryKind}
          onEntryKindChange={filterState.setEntryKind}
          ignoreCase={filterState.ignoreCase}
          onIgnoreCaseChange={filterState.setIgnoreCase}
          liveSearch={settingsState.liveSearch}
          onLiveSearchChange={settingsState.setLiveSearch}
          includeHidden={filterState.includeHidden}
          onIncludeHiddenChange={filterState.setIncludeHidden}
          extensionFilter={filterState.extensionsRaw}
          onExtensionFilterChange={filterState.setExtensionsRaw}
          onToggleFilters={() => layoutState.setFiltersOpen((prev) => !prev)}
          themeId={themeState.themeId}
          onThemeChange={themeState.setThemeId}
          themeOptions={themeState.themeOptions}
          onOpenCommandPalette={() => layoutState.setPaletteOpen(true)}
          onToggleSettings={() => layoutState.setSettingsOpen((prev) => !prev)}
          onToggleLeftPanel={() => layoutState.setLeftVisible((prev) => !prev)}
          onToggleRightPanel={() => layoutState.setRightVisible((prev) => !prev)}
          tr={tr}
        />

        {searchState.isSearching ? (
          <div className="progress-line" title={tr("app.status.scanningProgress", "Проверено: {{count}}", { count: searchState.checkedPaths })} />
        ) : null}

        {layoutState.filtersOpen ? (
          <FiltersPanel
            entryKind={filterState.entryKind}
            onEntryKindChange={filterState.setEntryKind}
            extensionsRaw={filterState.extensionsRaw}
            onExtensionsRawChange={filterState.setExtensionsRaw}
            excludePathsRaw={filterState.excludePathsRaw}
            onExcludePathsRawChange={filterState.setExcludePathsRaw}
            maxDepthUnlimited={filterState.maxDepthUnlimited}
            onMaxDepthUnlimitedChange={filterState.setMaxDepthUnlimited}
            maxDepth={filterState.maxDepth}
            onMaxDepthChange={filterState.setMaxDepth}
            sizeFilterEnabled={filterState.sizeFilterEnabled}
            onSizeFilterEnabledChange={filterState.setSizeFilterEnabled}
            sizeComparison={filterState.sizeComparison}
            onSizeComparisonChange={filterState.setSizeComparison}
            sizeValue={filterState.sizeValue}
            onSizeValueChange={filterState.setSizeValue}
            sizeUnit={filterState.sizeUnit}
            onSizeUnitChange={filterState.setSizeUnit}
            modifiedFilterEnabled={filterState.modifiedFilterEnabled}
            onModifiedFilterEnabledChange={filterState.setModifiedFilterEnabled}
            modifiedAfter={filterState.modifiedAfter}
            onModifiedAfterChange={filterState.setModifiedAfter}
            modifiedBefore={filterState.modifiedBefore}
            onModifiedBeforeChange={filterState.setModifiedBefore}
            createdFilterEnabled={filterState.createdFilterEnabled}
            onCreatedFilterEnabledChange={filterState.setCreatedFilterEnabled}
            createdAfter={filterState.createdAfter}
            onCreatedAfterChange={filterState.setCreatedAfter}
            createdBefore={filterState.createdBefore}
            onCreatedBeforeChange={filterState.setCreatedBefore}
            strict={filterState.strict}
            onStrictChange={filterState.setStrict}
            ignoreCase={filterState.ignoreCase}
            onIgnoreCaseChange={filterState.setIgnoreCase}
            includeHidden={filterState.includeHidden}
            onIncludeHiddenChange={filterState.setIncludeHidden}
            searchBackend={filterState.searchBackend}
            onSearchBackendChange={filterState.setSearchBackend}
            indexStatus={index.indexStatusSnapshot}
            indexUpdatedAtLabel={indexUpdatedAtLabel}
            isRebuildingIndex={index.isRebuildingIndex}
            onRebuildIndex={() => void index.handleRebuildIndex(indexRoots)}
            onCancelRebuild={() => void handleCancelRebuild()}
            indexHint={index.indexHint}
            rebuildProgress={index.rebuildProgress}
            limitMode={filterState.limitMode}
            onLimitModeChange={filterState.setLimitMode}
            customLimit={filterState.customLimit}
            onCustomLimitChange={filterState.setCustomLimit}
            onApply={() => {
              layoutState.setFiltersOpen(false);
              void handleSearch();
            }}
            onResetAll={filterState.clearAllFilters}
            tr={tr}
          />
        ) : null}

        {layoutState.settingsOpen ? (
          <SettingsPanel
            language={appLanguage}
            onLanguageChange={(value) => void i18n.changeLanguage(value)}
            liveSearch={settingsState.liveSearch}
            onLiveSearchChange={settingsState.setLiveSearch}
            regexEnabled={settingsState.regexEnabled}
            onRegexEnabledChange={settingsState.setRegexEnabled}
            debounceMs={settingsState.debounceMs}
            onDebounceMsChange={settingsState.setDebounceMs}
            indexTtlHours={settingsState.indexTtlHours}
            onIndexTtlHoursChange={settingsState.setIndexTtlHours}
            indexCheckIntervalMinutes={settingsState.indexCheckIntervalMinutes}
            onIndexCheckIntervalMinutesChange={settingsState.setIndexCheckIntervalMinutes}
            newThemeName={uiState.newThemeName}
            onNewThemeNameChange={uiState.setNewThemeName}
            newThemeBg={uiState.newThemeBg}
            onNewThemeBgChange={uiState.setNewThemeBg}
            newThemeText={uiState.newThemeText}
            onNewThemeTextChange={uiState.setNewThemeText}
            newThemeAccent={uiState.newThemeAccent}
            onNewThemeAccentChange={uiState.setNewThemeAccent}
            onCreateCustomTheme={() => {
              const name = uiState.newThemeName.trim();
              if (!name) return;
              const id = `custom-${Date.now()}`;
              themeState.setCustomThemes((prev) => prev.concat({
                id,
                name,
                colors: {
                  bg: uiState.newThemeBg,
                  surface: tintHex(uiState.newThemeBg, 0.08),
                  surfaceAlt: tintHex(uiState.newThemeBg, 0.16),
                  border: darkenHex(uiState.newThemeBg, 0.18),
                  text: uiState.newThemeText,
                  muted: darkenHex(uiState.newThemeText, 0.25),
                  accent: uiState.newThemeAccent,
                  accentSoft: tintHex(uiState.newThemeAccent, 0.65)
                }
              }));
              themeState.setThemeId(id);
              uiState.setNewThemeName("");
            }}
            tr={tr}
          />
        ) : null}

        <section
          className="layout"
          style={{
            gridTemplateColumns: layoutState.leftVisible
              ? layoutState.rightVisible
                ? `${layoutState.leftWidth}px 2px minmax(0, 1fr) 2px ${layoutState.rightWidth}px`
                : `${layoutState.leftWidth}px 2px minmax(0, 1fr)`
              : layoutState.rightVisible
                ? `minmax(0, 1fr) 2px ${layoutState.rightWidth}px`
                : "minmax(0, 1fr)"
          }}
        >
          {layoutState.leftVisible ? (
            <LeftSidebar
              tr={tr}
              roots={roots.roots}
              primaryRoot={roots.primaryRoot}
              newProfileName={uiState.newProfileName}
              history={persistence.history}
              profiles={persistence.profiles}
              computerRoots={filesystemTree.computerRoots}
              treeChildren={filesystemTree.treeChildren}
              expandedTree={filesystemTree.expandedTree}
              historyOpen={uiState.historyOpen}
              onToggleHistoryOpen={() => uiState.setHistoryOpen((prev) => !prev)}
              onToggleTreeExpand={filesystemTree.handleToggleTreeExpand}
              onSelectTreeRoot={(path) => {
                upsertRoot(path);
                roots.setPrimaryRoot(path);
              }}
              onPickRootPath={() => void handlePickRootPath()}
              onRemoveRoot={handleRemoveRoot}
              onRootEnabledChange={(path, enabled) =>
                roots.setRoots((prev) =>
                  prev.map((item) => (item.path === path ? { ...item, enabled } : item))
                )
              }
              onRootContextMenu={uiState.setContextMenu}
              onNewProfileNameChange={uiState.setNewProfileName}
              onSaveProfile={() => void handleSaveProfile()}
              onApplyProfile={applyProfile}
              onDeleteProfile={(profileId) => void handleDeleteProfile(profileId)}
              onClearHistory={requestClearHistory}
              onSelectHistoryQuery={setQuery}
              onDropRootPath={upsertRoot}
            />
          ) : null}

          {layoutState.leftVisible ? <div className="splitter" onMouseDown={() => { document.body.dataset.dragPanel = "left"; }} /> : null}
          <ResultsWorkspace
            containerRef={resultPaneRef}
            displayMode={layoutState.displayMode}
            setDisplayMode={layoutState.setDisplayMode}
            sortMode={filterState.sortMode}
            setSortMode={filterState.setSortMode}
            chips={chips}
            onClearAllFilters={filterState.clearAllFilters}
            results={searchState.results}
            selectedPath={searchState.selectedPath}
            onSelectPath={searchState.setSelectedPath}
            onResultContextMenu={(event, item) => {
              event.preventDefault();
              uiState.setContextMenu({ type: "result", x: event.clientX, y: event.clientY, item });
            }}
            scrollTop={uiState.scrollTop}
            setScrollTop={uiState.setScrollTop}
            listHeight={uiState.listHeight}
            visibleRows={visibleRows}
            formatBytes={formatBytes}
            formatDate={formatDate}
            t={tr}
          />

          {layoutState.rightVisible ? <div className="splitter" onMouseDown={() => { document.body.dataset.dragPanel = "right"; }} /> : null}

          {layoutState.rightVisible ? (
            <DetailsSidebar
              tr={tr}
              selectedResult={selectedResult}
              onCopyPath={(path) => void handleCopyPath(path)}
              onOpenPath={(path) => void handleOpenPath(path)}
              onOpenParent={(path) => void handleOpenParent(path)}
              onRevealPath={(path) => void handleRevealPath(path)}
              onAddFavorite={(path) => void handleAddFavorite(path)}
            />
          ) : null}
        </section>

        <StatusBar
          resultsCount={searchState.results.length}
          status={searchState.status}
          statusText={statusText}
          checkedPaths={searchState.checkedPaths}
          activeSearchId={searchState.activeSearchId}
          tr={tr}
        />

        <AppContextMenu
          contextMenu={uiState.contextMenu}
          onOpenPath={(path) => void handleOpenPath(path)}
          onOpenParent={(path) => void handleOpenParent(path)}
          onRevealPath={(path) => void handleRevealPath(path)}
          onCopyPath={(path) => void handleCopyPath(path)}
          onCopyName={(name) => void handleCopyName(name)}
          onAddFavorite={(path) => void handleAddFavorite(path)}
          onSetPrimaryRoot={roots.setPrimaryRoot}
          onDeleteRoot={(path) => roots.setRoots((prev) => prev.filter((item) => item.path !== path))}
          tr={tr}
        />
      </main>

      <CommandPalette open={layoutState.paletteOpen} onClose={() => layoutState.setPaletteOpen(false)} actions={commandActions} />
      <ToastHost items={toasts} onClose={closeToast} />
      <ConfirmDialog
        open={confirmClearHistory}
        title={tr("app.dialog.clearHistory.title", "Clear History")}
        message={tr("app.dialog.clearHistory.message", "Are you sure you want to clear all search history? This action cannot be undone.")}
        confirmLabel={tr("app.dialog.clearHistory.confirm", "Clear")}
        cancelLabel={tr("app.dialog.clearHistory.cancel", "Cancel")}
        onConfirm={() => void handleClearHistory()}
        onCancel={() => setConfirmClearHistory(false)}
      />
    </>
  );
}
