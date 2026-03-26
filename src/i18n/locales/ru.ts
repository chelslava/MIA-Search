const ru = {
  app: {
    labels: {
      searchPlaceholder: "Поиск файлов и папок...",
      search: "Поиск",
      cancelSearch: "Отменить поиск",
      clear: "Очистить",
      live: "Live",
      liveSearch: "Live search",
      filters: "Фильтры",
      commandPalette: "Командная палитра",
      settings: "Настройки",
      leftPanel: "Левая панель",
      rightPanel: "Правая панель",
      advancedFilters: "Расширенные фильтры",
      itemType: "Тип элементов",
      extensions: "Расширения",
      depth: "Глубина",
      size: "Размер",
      modifiedDate: "Дата изменения",
      createdDate: "Дата создания",
      modes: "Режимы",
      resultLimit: "Лимит результатов",
      general: "Общие",
      language: "Язык",
      liveSearchDefault: "Live search по умолчанию",
      debounceMs: "Debounce (мс)",
      customTheme: "Пользовательская тема",
      themeName: "Имя темы",
      background: "Фон",
      text: "Текст",
      accent: "Акцент",
      createTheme: "Создать тему",
      rootPaths: "Корневые пути",
      primaryRoot: "Основной",
      newPath: "Новый путь",
      addPath: "Добавить путь",
      searchProfiles: "Профили поиска",
      save: "Сохранить",
      favorites: "Избранное",
      searchHistory: "История поиска",
      details: "Детали",
      copy: "Копия",
      open: "Открыть",
      openParent: "Открыть родительскую папку",
      revealInFileManager: "Показать в файловом менеджере",
      copyPath: "Копировать путь",
      copyFullPath: "Копировать полный путь",
      copyName: "Копировать имя",
      addToFavorites: "Добавить в избранное",
      remove: "Удалить",
      setAsPrimary: "Сделать основным",
      nothingSelected: "Выберите элемент в списке результатов.",
      noName: "Без имени",
      file: "Файл",
      folder: "Папка",
      hidden: "Скрытый",
      yes: "Да",
      no: "Нет",
      sourceRoot: "Корневой источник",
      icon: "Иконка",
      name: "Имя",
      fullPath: "Полный путь",
      resultSize: "Размер",
      modifiedAt: "Дата изменения",
      type: "Тип",
      viewTable: "Таблица",
      viewCompact: "Компактно",
      viewCards: "Карточки",
      sortRelevance: "По релевантности",
      sortName: "По имени",
      sortSize: "По размеру",
      sortModified: "По дате изменения",
      sortType: "По типу",
      resetAllFilters: "Сбросить все фильтры",
      dir: "Папка",
      colIcon: "Иконка",
      colName: "Имя",
      colPath: "Полный путь",
      colSize: "Размер",
      colModified: "Дата изменения",
      colType: "Тип",
      searchModeTable: "Таблица",
      searchModeCompact: "Компактно",
      searchModeCards: "Карточки",
      sortByRelevance: "По релевантности",
      sortByName: "По имени",
      sortBySize: "По размеру",
      sortByModified: "По дате изменения",
      sortByType: "По типу",
      clearFilters: "Сбросить все фильтры"
    },
    tooltips: {
      leftPanel: "Левая панель",
      clear: "Очистить",
      liveSearch: "Live search",
      filters: "Фильтры",
      commandPalette: "Командная палитра",
      settings: "Настройки",
      rightPanel: "Правая панель"
    },
    search: {
      placeholder: "Поиск файлов и папок...",
      commandHints:
        "Команды: /wc *.rs  /re ^main.*\\.ts$  /plain текст  /files /folders  ext:rs,md  /case /nocase",
      commandQuickHintDefault: "Быстрые переключатели: включайте режимы кнопками ниже",
      quickButtons: {
        wc: "WC",
        re: "RE",
        plain: "PLAIN",
        files: "FILES",
        folders: "DIRS",
        case: "Aa"
      },
      quickHints: {
        wc: "Wildcard режим: * и ?",
        re: "Regex режим: регулярные выражения",
        reDisabled: "Regex отключен в настройках",
        plain: "Обычный текстовый поиск",
        files: "Искать только файлы",
        folders: "Искать только папки",
        case: "С учетом регистра"
      }
    },
    actions: {
      searchTop: "🔎 Поиск",
      search: "Поиск",
      cancelSearch: "Отменить поиск"
    },
    filters: {
      ariaLabel: "Расширенные фильтры",
      kind: {
        legend: "Тип элементов",
        any: "Файлы и папки",
        file: "Только файлы",
        directory: "Только папки"
      },
      extensions: {
        legend: "Расширения",
        placeholder: "rs, txt, md",
        hint: "Разделяйте значения запятыми"
      },
      exclude: {
        legend: "Исключить пути",
        placeholder: "node_modules, .git, target",
        hint: "Разделяйте маски запятыми"
      },
      depth: {
        legend: "Глубина",
        unlimited: "Без ограничений"
      },
      size: {
        legend: "Размер",
        enabled: "Учитывать",
        comparison: {
          greater: "больше",
          smaller: "меньше",
          equal: "равно"
        }
      },
      modified: {
        legend: "Дата изменения",
        enabled: "Учитывать"
      },
      created: {
        legend: "Дата создания",
        enabled: "Учитывать"
      },
      modes: {
        legend: "Режимы",
        strict: "Строгий режим",
        ignoreCase: "Игнорировать регистр",
        hidden: "Включать скрытые"
      },
      limit: {
        legend: "Лимит результатов",
        custom: "Пользовательский",
        none: "Без лимита"
      },
      apply: "Применить",
      resetAll: "Сбросить все",
      resetAllFilters: "Сбросить все фильтры"
    },
    settings: {
      ariaLabel: "Настройки",
      general: "Общие",
      language: {
        ru: "Русский",
        en: "English"
      },
      liveSearchDefault: "Live search по умолчанию",
      regexEnabled: "Включить regex",
      debounce: "Debounce (мс)",
      indexTtlHours: "TTL авто-индекса (часы)",
      indexCheckIntervalMinutes: "Проверка индекса (мин)",
      customTheme: "Пользовательская тема",
      themeName: {
        placeholder: "Имя темы"
      },
      themeBg: "Фон",
      themeText: "Текст",
      themeAccent: "Акцент",
      createTheme: "Создать тему"
    },
    roots: {
      summary: "Корневые пути",
      primary: "Основной: {{path}}",
      newPath: {
        placeholder: "Новый путь"
      },
      addPath: "Добавить путь",
      pickPath: "Выбрать...",
      removePath: "Удалить путь"
    },
    computer: {
      summary: "Этот компьютер"
    },
    profiles: {
      summary: "Профили поиска",
      name: {
        placeholder: "Имя профиля"
      },
      save: "Сохранить"
    },
    favorites: {
      summary: "Избранное"
    },
    history: {
      summary: "История поиска",
      clear: "Очистить историю",
      emptyQuery: "(пустой запрос)"
    },
    viewModes: {
      table: "Таблица",
      compact: "Компактно",
      cards: "Карточки"
    },
    sort: {
      relevance: "По релевантности",
      name: "По имени",
      size: "По размеру",
      modified: "По дате изменения",
      type: "По типу"
    },
    common: {
      unnamed: "Без имени",
      folder: "Папка",
      file: "Файл",
      yes: "Да",
      no: "Нет"
    },
    results: {
      columns: {
        icon: "Иконка",
        name: "Имя",
        path: "Полный путь",
        size: "Размер",
        modified: "Дата изменения",
        type: "Тип"
      }
    },
    details: {
      title: "Детали",
      fullPath: "Полный путь",
      copy: "Копия",
      size: "Размер",
      created: "Дата создания",
      modified: "Дата изменения",
      hidden: "Скрытый",
      sourceRoot: "Корневой источник",
      open: "Открыть",
      openParent: "Открыть родительскую папку",
      reveal: "Показать в файловом менеджере",
      copyPath: "Копировать путь",
      addFavorite: "Добавить в избранное",
      empty: "Выберите элемент в списке результатов."
    },
    context: {
      open: "Открыть",
      openParent: "Открыть родительскую папку",
      reveal: "Показать в файловом менеджере",
      copyPath: "Копировать полный путь",
      copyName: "Копировать имя",
      addFavorite: "Добавить в избранное",
      makePrimary: "Сделать основным",
      delete: "Удалить"
    },
    themes: {
      system: "Системная"
    },
    chips: {
      filesOnly: "Только файлы",
      dirsOnly: "Только папки",
      extensions: "Расширения: {{extensions}}",
      excludePaths: "Исключить: {{paths}}",
      depth: "Глубина: {{depth}}",
      size: "Размер {{sign}} {{value}} {{unit}}",
      modified: "Дата изменения",
      created: "Дата создания",
      strict: "Строгий режим",
      caseSensitive: "С учетом регистра",
      hidden: "Скрытые",
      limit: "Лимит: {{limit}}"
    },
    commands: {
      newSearch: "> Новый поиск",
      rebuildIndex: "> Перестроить индекс",
      clearHistory: "> Очистить историю",
      toggleTheme: "> Переключить тему",
      focusSearch: "/ Фокус в строку поиска",
      help: "? Горячие клавиши"
    },
    messages: {
      hotkeys: "⌘K, ⌘F, ⌘⇧R, Esc, F5, ↑/↓, Enter"
    },
    status: {
      persistenceError: "Ошибка загрузки данных",
      tauriUnavailable: "Tauri runtime не обнаружен",
      scanning: "Сканирование...",
      startError: "Ошибка запуска: {{error}}",
      stopping: "Остановка...",
      stopError: "Не удалось остановить поиск",
      ready: "Готово",
      stopped: "Остановлено",
      error: "Ошибка: {{message}}",
      errorInvalidQuery: "Ошибка запроса поиска: {{message}}",
      errorState: "Внутренняя ошибка состояния поиска: {{message}}",
      errorExecution: "Ошибка выполнения поиска: {{message}}",
      eventsError: "Ошибка подписки событий",
      elapsedSeconds: "{{value}} сек",
      limitWarning: "Показано только {{count}} результатов"
    },
    toast: {
      searchStartFailed: "Не удалось запустить поиск",
      openFailed: "Не удалось открыть элемент",
      openParentFailed: "Не удалось открыть родительскую папку",
      revealFailed: "Не удалось показать в проводнике",
      pathCopied: "Путь скопирован",
      pathCopyFailed: "Не удалось скопировать путь",
      nameCopied: "Имя скопировано",
      nameCopyFailed: "Не удалось скопировать имя",
      favoriteAdded: "Добавлено в избранное",
      favoriteAddFailed: "Не удалось добавить в избранное",
      favoriteRemoveFailed: "Не удалось удалить из избранного",
      profileSaved: "Профиль сохранен",
      profileSaveFailed: "Не удалось сохранить профиль",
      profileDeleteFailed: "Не удалось удалить профиль",
      historyCleared: "История очищена",
      historyClearFailed: "Не удалось очистить историю",
      themeNameRequired: "Введите имя темы",
      pickFolderFailed: "Не удалось выбрать папку"
    },
    statusbar: {
      found: "Найдено: {{count}} элементов",
      status: "Статус: {{status}}",
      time: "Время: {{elapsed}}",
      checked: "Проверено: {{count}}",
      ttfr: "TTFR: {{value}}",
      throughput: "Скорость: {{value}}",
      errors: "Ошибки: {{count}}",
      id: "ID: {{id}}",
      searchId: "ID: {{id}}",
      warningPrefix: "▲"
    }
  },
  commandPalette: {
    ariaLabel: "Палитра команд",
    title: "Палитра команд",
    placeholder: "Введите текст для фильтрации команд",
    resultsLabel: "Доступные действия",
    emptyState: "Нет команд для текущего запроса."
  },
  toast: {
    kind: {
      info: "инфо",
      success: "успех",
      error: "ошибка"
    },
    hostLabel: "Уведомления",
    closeButtonAriaLabel: "Закрыть уведомление",
    closeButton: "Закрыть"
  }
} as const;

export default ru;
