import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, RotateCcw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[MPO-pro ErrorBoundary caught an unhandled error]:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetDefaults = () => {
    try {
      localStorage.removeItem("mpo_layers_v2");
      localStorage.removeItem("mpo_active_layer_id_v2");
      localStorage.removeItem("mpo_history_v2");
      fetch("http://127.0.0.1:4849/api/layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layers: [], activeLayerId: "" }),
      }).catch(() => {});
    } catch {}
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0d14",
            color: "#e2e8f0",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: "24px",
            zIndex: 999999,
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "rgba(18, 24, 38, 0.92)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "16px",
              padding: "32px 28px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.15)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.16)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f87171",
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#f87171" }}>
              Application Render Exception
            </h2>

            <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              MPO-pro recovered from an unexpected error. You can reload the app or reset layer settings to factory defaults.
            </p>

            {this.state.error && (
              <div
                style={{
                  width: "100%",
                  maxHeight: "120px",
                  overflowY: "auto",
                  padding: "10px 12px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontFamily: "Consolas, monospace",
                  color: "#fda4af",
                  textAlign: "left",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "8px" }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  background: "rgba(99, 102, 241, 0.2)",
                  border: "1px solid rgba(99, 102, 241, 0.5)",
                  borderRadius: "8px",
                  color: "#c7d2fe",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} />
                <span>Reload</span>
              </button>

              <button
                onClick={this.handleResetDefaults}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  borderRadius: "8px",
                  color: "#fca5a5",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={14} />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
