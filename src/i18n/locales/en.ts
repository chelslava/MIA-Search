const en = {
  app: {
    labels: {
      searchPlaceholder: "Search files and folders...",
      search: "Search",
      cancelSearch: "Cancel search",
      clear: "Clear",
      live: "Live",
      liveSearch: "Live search",
      filters: "Filters",
      commandPalette: "Command palette",
      settings: "Settings",
      leftPanel: "Left panel",
      rightPanel: "Right panel",
      advancedFilters: "Advanced filters",
      itemType: "Item type",
      extensions: "Extensions",
      depth: "Depth",
      size: "Size",
      modifiedDate: "Modified date",
      createdDate: "Created date",
      modes: "Modes",
      resultLimit: "Result limit",
      general: "General",
      language: "Language",
      liveSearchDefault: "Live search by default",
      debounceMs: "Debounce (ms)",
      customTheme: "Custom theme",
      themeName: "Theme name",
      background: "Background",
      text: "Text",
      accent: "Accent",
      createTheme: "Create theme",
      rootPaths: "Root paths",
      primaryRoot: "Primary",
      newPath: "New path",
      addPath: "Add path",
      searchProfiles: "Search profiles",
      save: "Save",
      favorites: "Favorites",
      searchHistory: "Search history",
      details: "Details",
      copy: "Copy",
      open: "Open",
      openParent: "Open parent folder",
      revealInFileManager: "Show in file manager",
      copyPath: "Copy path",
      copyFullPath: "Copy full path",
      copyName: "Copy name",
      addToFavorites: "Add to favorites",
      remove: "Remove",
      setAsPrimary: "Set as primary",
      nothingSelected: "Select an item from the results list.",
      noName: "Untitled",
      file: "File",
      folder: "Folder",
      hidden: "Hidden",
      yes: "Yes",
      no: "No",
      sourceRoot: "Source root",
      icon: "Icon",
      name: "Name",
      fullPath: "Full path",
      resultSize: "Size",
      modifiedAt: "Modified date",
      type: "Type",
      viewTable: "Table",
      viewCompact: "Compact",
      viewCards: "Cards",
      sortRelevance: "By relevance",
      sortName: "By name",
      sortSize: "By size",
      sortModified: "By modified date",
      sortType: "By type",
      resetAllFilters: "Clear all filters",
      dir: "Folder",
      colIcon: "Icon",
      colName: "Name",
      colPath: "Full path",
      colSize: "Size",
      colModified: "Modified date",
      colType: "Type",
      searchModeTable: "Table",
      searchModeCompact: "Compact",
      searchModeCards: "Cards",
      sortByRelevance: "By relevance",
      sortByName: "By name",
      sortBySize: "By size",
      sortByModified: "By modified date",
      sortByType: "By type",
      clearFilters: "Clear all filters"
    },
    tooltips: {
      leftPanel: "Left panel",
      clear: "Clear",
      liveSearch: "Live search",
      filters: "Filters",
      commandPalette: "Command palette",
      settings: "Settings",
      rightPanel: "Right panel"
    },
    search: {
      placeholder: "Search files and folders...",
      commandHints:
        "Commands: /wc *.rs  /re ^main.*\\.ts$  /plain text  /files /folders  ext:rs,md  /case /nocase",
      commandQuickHintDefault: "Quick commands: click a token button and search immediately",
      quickButtons: {
        wc: "WC",
        re: "RE",
        plain: "PLAIN",
        files: "FILES",
        folders: "DIRS",
        case: "Aa"
      },
      quickHints: {
        wc: "Wildcard mode: * and ?",
        re: "Regex mode: regular expressions",
        reDisabled: "Regex is disabled in settings",
        plain: "Plain text search",
        files: "Search files only",
        folders: "Search folders only",
        case: "Case sensitive"
      }
    },
    actions: {
      searchTop: "🔎 Search",
      search: "Search",
      cancelSearch: "Cancel search"
    },
    filters: {
      ariaLabel: "Advanced filters",
      kind: {
        legend: "Item type",
        any: "Files and folders",
        file: "Files only",
        directory: "Folders only"
      },
      extensions: {
        legend: "Extensions",
        placeholder: "rs, txt, md",
        hint: "Separate values with commas"
      },
      depth: {
        legend: "Depth",
        unlimited: "Unlimited"
      },
      size: {
        legend: "Size",
        enabled: "Enable",
        comparison: {
          greater: "greater than",
          smaller: "smaller than",
          equal: "equal to"
        }
      },
      modified: {
        legend: "Modified date",
        enabled: "Enable"
      },
      created: {
        legend: "Created date",
        enabled: "Enable"
      },
      modes: {
        legend: "Modes",
        strict: "Strict mode",
        ignoreCase: "Case insensitive",
        hidden: "Include hidden"
      },
      limit: {
        legend: "Result limit",
        custom: "Custom",
        none: "No limit"
      },
      apply: "Apply",
      resetAll: "Reset all",
      resetAllFilters: "Clear all filters"
    },
    settings: {
      ariaLabel: "Settings",
      general: "General",
      language: {
        ru: "Russian",
        en: "English"
      },
      liveSearchDefault: "Live search by default",
      regexEnabled: "Enable regex",
      debounce: "Debounce (ms)",
      customTheme: "Custom theme",
      themeName: {
        placeholder: "Theme name"
      },
      themeBg: "Background",
      themeText: "Text",
      themeAccent: "Accent",
      createTheme: "Create theme"
    },
    roots: {
      summary: "Root paths",
      primary: "Primary: {{path}}",
      newPath: {
        placeholder: "New path"
      },
      addPath: "Add path",
      pickPath: "Choose...",
      removePath: "Remove path"
    },
    computer: {
      summary: "This PC"
    },
    profiles: {
      summary: "Search profiles",
      name: {
        placeholder: "Profile name"
      },
      save: "Save"
    },
    favorites: {
      summary: "Favorites"
    },
    history: {
      summary: "Search history",
      clear: "Clear history",
      emptyQuery: "(empty query)"
    },
    viewModes: {
      table: "Table",
      compact: "Compact",
      cards: "Cards"
    },
    sort: {
      relevance: "By relevance",
      name: "By name",
      size: "By size",
      modified: "By modified date",
      type: "By type"
    },
    common: {
      unnamed: "Untitled",
      folder: "Folder",
      file: "File",
      yes: "Yes",
      no: "No"
    },
    results: {
      columns: {
        icon: "Icon",
        name: "Name",
        path: "Full path",
        size: "Size",
        modified: "Modified date",
        type: "Type"
      }
    },
    details: {
      title: "Details",
      fullPath: "Full path",
      copy: "Copy",
      size: "Size",
      created: "Created date",
      modified: "Modified date",
      hidden: "Hidden",
      sourceRoot: "Source root",
      open: "Open",
      openParent: "Open parent folder",
      reveal: "Show in file manager",
      copyPath: "Copy path",
      addFavorite: "Add to favorites",
      empty: "Select an item from the results list."
    },
    context: {
      open: "Open",
      openParent: "Open parent folder",
      reveal: "Show in file manager",
      copyPath: "Copy full path",
      copyName: "Copy name",
      addFavorite: "Add to favorites",
      makePrimary: "Set as primary",
      delete: "Remove"
    },
    themes: {
      system: "System"
    },
    chips: {
      filesOnly: "Files only",
      dirsOnly: "Folders only",
      extensions: "Extensions: {{extensions}}",
      depth: "Depth: {{depth}}",
      size: "Size {{sign}} {{value}} {{unit}}",
      modified: "Modified date",
      created: "Created date",
      strict: "Strict mode",
      caseSensitive: "Case sensitive",
      hidden: "Hidden",
      limit: "Limit: {{limit}}"
    },
    commands: {
      newSearch: "> New search",
      clearHistory: "> Clear history",
      toggleTheme: "> Toggle theme",
      focusSearch: "/ Focus search input",
      help: "? Keyboard shortcuts"
    },
    messages: {
      hotkeys: "⌘K, ⌘F, Esc, F5, ↑/↓, Enter"
    },
    status: {
      persistenceError: "Failed to load data",
      tauriUnavailable: "Tauri runtime not found",
      scanning: "Scanning...",
      startError: "Start error: {{error}}",
      stopping: "Stopping...",
      stopError: "Failed to stop search",
      ready: "Ready",
      stopped: "Stopped",
      error: "Error: {{message}}",
      eventsError: "Failed to subscribe to events",
      elapsedSeconds: "{{value}} s",
      limitWarning: "Showing only {{count}} results"
    },
    toast: {
      searchStartFailed: "Failed to start search",
      openFailed: "Failed to open item",
      openParentFailed: "Failed to open parent folder",
      revealFailed: "Failed to reveal in file manager",
      pathCopied: "Path copied",
      pathCopyFailed: "Failed to copy path",
      nameCopied: "Name copied",
      nameCopyFailed: "Failed to copy name",
      favoriteAdded: "Added to favorites",
      favoriteAddFailed: "Failed to add to favorites",
      favoriteRemoveFailed: "Failed to remove from favorites",
      profileSaved: "Profile saved",
      profileSaveFailed: "Failed to save profile",
      profileDeleteFailed: "Failed to delete profile",
      historyCleared: "History cleared",
      historyClearFailed: "Failed to clear history",
      themeNameRequired: "Enter a theme name",
      pickFolderFailed: "Failed to choose folder"
    },
    statusbar: {
      found: "Found: {{count}} items",
      status: "Status: {{status}}",
      time: "Time: {{elapsed}}",
      checked: "Checked: {{count}}",
      id: "ID: {{id}}",
      searchId: "ID: {{id}}",
      warningPrefix: "▲"
    }
  },
  commandPalette: {
    ariaLabel: "Command palette",
    title: "Command palette",
    placeholder: "Type to filter commands",
    resultsLabel: "Available actions",
    emptyState: "No commands match the current query."
  },
  toast: {
    kind: {
      info: "info",
      success: "success",
      error: "error"
    },
    hostLabel: "Notifications",
    closeButtonAriaLabel: "Close notification",
    closeButton: "Close"
  }
} as const;

export default en;
