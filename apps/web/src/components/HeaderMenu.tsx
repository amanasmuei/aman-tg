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
    variant: "ui" | "mono" = "ui",
  ) => (
    <button
      onClick={() => {
        onClick();
        onClose();
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-xl hover:opacity-90 ${variant === "mono" ? "mono" : ""}`}
      style={{
        color: tone === "danger" ? "var(--ember)" : "var(--paper)",
      }}
    >
      <Icon size={16} strokeWidth={1.9} />
      <span>{label}</span>
    </button>
  );

  const planLabel =
    plan === "pro" ? "Pro" : plan === "team" ? "Team" : t("free");

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-60 z-40 fade-in rounded-2xl p-2"
      style={{
        background: "var(--ink-1)",
        border: "1px solid var(--rule-2)",
        boxShadow: "0 24px 48px -16px rgba(0,0,0,0.7), 0 4px 12px -4px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="mono px-3 py-2 text-[10px] uppercase"
        style={{ color: "var(--paper-3)", letterSpacing: "0.22em" }}
      >
        <span style={{ color: "var(--sun)" }}>◆</span>{" "}
        <span className="display" style={{ fontSize: "12px", letterSpacing: "normal", textTransform: "none" }}>
          {planLabel}
        </span>
        {planExpiresAt && (
          <span className="mono">
            {" · "}
            {new Date(planExpiresAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="h-px mx-2 my-1" style={{ background: "var(--rule)" }} />
      {row(t("inviteFriends"), Gift, onInvite)}
      {row(getLocale().toUpperCase(), Globe, onToggleLocale, "default", "mono")}
      {row(t("resetData"), RotateCcw, onReset, "danger")}
      {row("About", HelpCircle, () => {
        window.open("https://aman.kooleklabs.com", "_blank");
      })}
    </div>
  );
}
