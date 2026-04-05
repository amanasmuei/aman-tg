import { useState, useEffect } from "react";
import { t } from "../lib/i18n";

interface UsageInfo {
  messagesUsed: number;
  messagesLimit: number;
  plan: string;
}

export function Header({ onReset }: { onReset?: () => void } = {}) {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    const controller = new AbortController();
    fetch(`/api/users/me?telegramId=${telegramId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.telegramId) {
          setUsage({
            messagesUsed: data.messagesUsed,
            messagesLimit: data.messagesLimit,
            plan: data.plan,
          });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const isLow = usage && usage.plan === "free" && usage.messagesLimit > 0 && usage.messagesUsed >= usage.messagesLimit - 5;

  const handleReset = async () => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    if (!confirm("Are you sure you want to reset all your data? This will delete all conversations, tasks, and memories. This cannot be undone.")) return;

    setResetting(true);
    try {
      const res = await fetch("/api/users/me/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Data cleared: ${data.cleared.conversations} conversations, ${data.cleared.messages} messages, ${data.cleared.todos} tasks, ${data.cleared.memories} memories.`);
        onReset?.();
        window.location.reload();
      }
    } catch {
      alert("Failed to reset data. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="text-2xl font-bold tracking-tight">aman</div>
        {usage?.plan === "pro" ? (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium"
               style={{ background: "#f59e0b", color: "#000" }}>
            PRO
          </div>
        ) : (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium"
               style={{ background: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}>
            beta
          </div>
        )}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="ml-auto text-xs px-2 py-1 rounded-lg transition-opacity disabled:opacity-30"
          style={{ background: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-hint-color)" }}
        >
          {resetting ? "..." : "Reset Data"}
        </button>
      </div>
      <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
        {t("tagline")}
      </p>
      {usage && usage.plan === "free" && usage.messagesLimit > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden"
               style={{ background: "var(--tg-theme-secondary-bg-color)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (usage.messagesUsed / usage.messagesLimit) * 100)}%`,
                background: isLow ? "#ef4444" : "var(--tg-theme-button-color)",
              }}
            />
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: isLow ? "#ef4444" : "var(--tg-theme-hint-color)" }}>
            {usage.messagesUsed}/{usage.messagesLimit} {t("messages")}
          </span>
        </div>
      )}
    </div>
  );
}
