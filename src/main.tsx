import "./i18n";
import { App } from "./app/App";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import { render } from "preact";

render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  document.getElementById("root")!
);
