import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import "./index.css";

// Global error logger to capture any unhandled exceptions
if (typeof window !== "undefined") {
  window.addEventListener("contextmenu", e => e.preventDefault());
  window.addEventListener("keydown", e => { if (e.key === "F12") { e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener("error", (e) => {
    console.error("[MPO-pro Global Error]", e.error || e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("[MPO-pro Unhandled Rejection]", e.reason);
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
