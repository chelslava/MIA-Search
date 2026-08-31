type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private formatPrefix(level: LogLevel, context?: string): string {
    const time = new Date().toISOString().slice(11, 23);
    const ctx = context ? ` [${context}]` : "";
    return `[${time}] [${level.toUpperCase()}]${ctx}`;
  }

  debug(message: string, context?: string, ...args: unknown[]) {
    if (import.meta.env?.DEV) {
      console.debug(`${this.formatPrefix("debug", context)} ${message}`, ...args);
    }
  }

  info(message: string, context?: string, ...args: unknown[]) {
    console.info(`${this.formatPrefix("info", context)} ${message}`, ...args);
  }

  warn(message: string, context?: string, ...args: unknown[]) {
    console.warn(`${this.formatPrefix("warn", context)} ${message}`, ...args);
  }

  error(message: string, context?: string, ...args: unknown[]) {
    console.error(`${this.formatPrefix("error", context)} ${message}`, ...args);
  }
}

export const logger = new Logger();

