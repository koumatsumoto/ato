import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { initViewportHeight } from "./shared/lib/viewport-height";
import "./globals.css";

initViewportHeight();

// GitHub Pages SPA fallback: 404.html からのリダイレクトを処理
const redirectParam = new URLSearchParams(window.location.search).get("redirect");
if (redirectParam && redirectParam.startsWith(import.meta.env.BASE_URL)) {
  window.history.replaceState(null, "", redirectParam);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
