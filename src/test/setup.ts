import "@testing-library/jest-dom/vitest";
import "../i18n";

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

// jsdom doesn't provide ResizeObserver
Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock
});
