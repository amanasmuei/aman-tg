import { useEffect, useRef } from "react";
import { t, getLocale } from "../lib/i18n";
import { RotateCcw, Gift, type LucideIcon } from "../lib/icons";
import { Globe, HelpCircle } from "lucide-react";

interface Props {
  plan: string;
  planExpiresAt: number | null;
  onReset: () => void;
  onInvite: () => void;
  onToggleLocale: () => void;
  onClose: () => void;
}

export function HeaderMenu({
  plan,
  planExpiresAt,
  onReset,
  onInvite,
  onToggleLocale,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [onClose]);

  const row = (
    label: string,
    Icon: LucideIcon,
    onClick: () => void,
    tone: "default" | "danger" = "default",
  ) => (
    <button
      onClick={() => {
        onClick();
        onClose();
      }}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-xl"
      style={{
        color: tone === "danger" ? "#f85149" : "var(--tg-theme-text-color)",
      }}
    >
      <Icon size={16} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );

  const planLabel =
    plan === "pro" ? "Pro" : plan === "team" ? "Team" : t("free");

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-56 z-40 fade-in rounded-2xl p-2 card-soft"
      style={{ background: "var(--tg-theme-secondary-bg-color)" }}
    >
      <div
        className="px-3 py-2 text-[11px] uppercase tracking-wider"
        style={{ color: "var(--tg-theme-hint-color)" }}
      >
        {planLabel}
        {planExpiresAt && (
          <span> · {new Date(planExpiresAt).toLocaleDateString()}</span>
        )}
      </div>
      {row(t("inviteFriends"), Gift, onInvite)}
      {row(`${getLocale().toUpperCase()}`, Globe, onToggleLocale)}
      {row(t("resetData"), RotateCcw, onReset, "danger")}
      {row("About", HelpCircle, () => {
        window.open("https://aman.kooleklabs.com", "_blank");
      })}
    </div>
  );
}
