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
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-transform active:scale-95"
        style={{
          color: isActive
            ? "var(--tg-theme-text-color)"
            : "var(--tg-theme-hint-color)",
        }}
      >
        <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
        <span className="text-[11px] font-semibold leading-none mt-0.5">
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-30 flex border-t bottom-nav-safe"
      style={{
        background: "var(--tg-theme-bg-color)",
        borderColor:
          "color-mix(in srgb, var(--tg-theme-text-color) 8%, transparent)",
      }}
    >
      {item("teman", t("navTeman"), Users)}
      {item("sembang", t("navSembang"), MessageCircle)}
    </nav>
  );
}
