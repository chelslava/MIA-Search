import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "20px",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "24px", marginBottom: "16px", color: "#dc2626" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px", maxWidth: "400px" }}>
            An unexpected error occurred. Please try reloading the application.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Reload Application
          </button>
          {this.state.error && (
            <details style={{ marginTop: "24px", textAlign: "left", maxWidth: "600px" }}>
              <summary style={{ cursor: "pointer", fontSize: "12px", color: "#9ca3af" }}>
                Error details
              </summary>
              <pre
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "4px",
                  fontSize: "11px",
                  overflow: "auto",
                  maxWidth: "100%",
                }}
              >
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
