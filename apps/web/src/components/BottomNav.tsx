import { t } from "../lib/i18n";
import { MessageCircle, Users, type LucideIcon } from "../lib/icons";
import { selectionChange } from "../lib/haptics";

export type Tab = "teman" | "sembang";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: Props) {
  const select = (tab: Tab) => {
    if (tab !== active) selectionChange();
    onChange(tab);
  };

  const item = (tab: Tab, label: string, Icon: LucideIcon) => {
    const isActive = active === tab;
    return (
      <button
        key={tab}
        onClick={() => select(tab)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-transform active:scale-95 relative"
        style={{
          color: isActive ? "var(--paper)" : "var(--paper-3)",
        }}
      >
        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
        <span
          className="text-[11px] font-semibold leading-none mt-1"
          style={{
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
        {isActive && (
          <span
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: "6px",
              width: "22px",
              height: "2px",
              background: "var(--sun)",
            }}
            aria-hidden
          />
        )}
      </button>
    );
  };

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-30 flex bottom-nav-safe"
      style={{
        background: "var(--ink-1)",
        borderTop: "1px solid var(--rule-2)",
      }}
    >
      {item("teman", t("navTeman"), Users)}
      {item("sembang", t("navSembang"), MessageCircle)}
    </nav>
  );
}
