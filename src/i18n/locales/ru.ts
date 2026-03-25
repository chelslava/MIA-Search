const ru = {
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
