import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Initialize Telegram WebApp + safe-area insets so our UI clears the
// Close pill (top-left) and the chevron/⋯ menu (top-right).
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  const root = document.documentElement;
  const applyInsets = () => {
    const s = tg.contentSafeAreaInset ?? tg.safeAreaInset ?? {};
    root.style.setProperty("--tg-safe-top", `${s.top ?? 0}px`);
    root.style.setProperty("--tg-safe-right", `${s.right ?? 0}px`);
    root.style.setProperty("--tg-safe-bottom", `${s.bottom ?? 0}px`);
    root.style.setProperty("--tg-safe-left", `${s.left ?? 0}px`);
  };
  applyInsets();
  tg.onEvent?.("safeAreaChanged", applyInsets);
  tg.onEvent?.("contentSafeAreaChanged", applyInsets);
  tg.ready?.();
  tg.expand?.();
}

createRoot(document.getElementById("root")!).render(<App />);
