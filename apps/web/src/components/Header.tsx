import { useState, useEffect } from "react";
import { t, greetingByHour, cycleLocale } from "../lib/i18n";
import { MoreHorizontal } from "../lib/icons";
import { HeaderMenu } from "./HeaderMenu";

interface UsageInfo {
  messagesUsed: number;
  messagesLimit: number;
  plan: string;
}

interface TelegramUser {
  first_name?: string;
}

/**
 * Compact app header.
 *
 * Row 1: brand wordmark + plan badge + overflow menu (Reset Data lives here).
 * Row 2: personalized greeting by time of day (if we have a first name).
 * Row 3 (conditional): free-tier usage bar, hidden for pro/team users.
 */
interface HeaderProps {
  onReset?: () => void;
  onInvite?: () => void;
  planExpiresAt?: number | null;
}

export function Header({
  onReset,
  onInvite,
  planExpiresAt = null,
}: HeaderProps = {}) {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Load user + usage
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    const tgUser = tg?.initDataUnsafe?.user as TelegramUser | undefined;
    if (tgUser?.first_name) setFirstName(tgUser.first_name);

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

  // Outside-click handling lives inside HeaderMenu.

  const isLow =
    usage &&
    usage.plan === "free" &&
    usage.messagesLimit > 0 &&
    usage.messagesUsed >= usage.messagesLimit - 5;

  const handleReset = () => {
    setMenuOpen(false);
    const tg = window.Telegram?.WebApp as any;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    tg.showConfirm(t("resetConfirm"), async (confirmed: boolean) => {
      if (!confirmed) return;
      setResetting(true);
      try {
        const res = await fetch("/api/users/me/data", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId }),
        });
        if (res.ok) {
          const data = await res.json();
          tg.showAlert(
            `Data cleared: ${data.cleared.conversations} conversations, ${data.cleared.messages} messages, ${data.cleared.todos} tasks, ${data.cleared.memories} memories.`,
            () => {
              onReset?.();
              window.location.reload();
            }
          );
        }
      } catch {
        tg.showAlert("Failed to reset data. Please try again.");
      } finally {
        setResetting(false);
      }
    });
  };

  const greetingLine = firstName
    ? `${greetingByHour()}, ${firstName} 👋`
    : t("tagline");

  return (
    <div
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + var(--tg-safe-top, 0px) + 14px)",
        paddingRight: "calc(env(safe-area-inset-right, 0px) + var(--tg-safe-right, 0px) + 16px)",
        paddingLeft: "calc(env(safe-area-inset-left, 0px) + var(--tg-safe-left, 0px) + 16px)",
        paddingBottom: 12,
      }}
    >
      {/* Row 1: brand + plan + menu */}
      <div className="flex items-center gap-2 mb-1">
        <div className="text-2xl font-bold tracking-tight leading-none">aman</div>
        {usage?.plan === "pro" ? (
          <div
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
            style={{ background: "#f59e0b", color: "#000" }}
          >
            PRO
          </div>
        ) : (
          <div
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
            style={{
              background: "var(--tg-theme-secondary-bg-color)",
              color: "var(--tg-theme-hint-color)",
            }}
          >
            FREE
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Overflow menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "var(--tg-theme-secondary-bg-color)" }}
            aria-label={t("menu")}
            disabled={resetting}
          >
            <MoreHorizontal
              size={18}
              style={{ color: "var(--tg-theme-hint-color)" }}
            />
          </button>
          {menuOpen && (
            <HeaderMenu
              plan={usage?.plan ?? "free"}
              planExpiresAt={planExpiresAt}
              onReset={handleReset}
              onInvite={() => onInvite?.()}
              onToggleLocale={() => {
                cycleLocale();
                window.location.reload();
              }}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Row 2: greeting */}
      <p
        className="text-sm leading-snug"
        style={{ color: "var(--tg-theme-hint-color)" }}
      >
        {greetingLine}
      </p>

      {/* Row 3: usage bar (free tier only) */}
      {usage && usage.plan === "free" && usage.messagesLimit > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--tg-theme-secondary-bg-color)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (usage.messagesUsed / usage.messagesLimit) * 100)}%`,
                background: isLow ? "#ef4444" : "var(--tg-theme-button-color)",
              }}
            />
          </div>
          <span
            className="text-[11px] flex-shrink-0 font-medium"
            style={{ color: isLow ? "#ef4444" : "var(--tg-theme-hint-color)" }}
          >
            {usage.messagesUsed}/{usage.messagesLimit} {t("messages")}
          </span>
        </div>
      )}
    </div>
  );
}
