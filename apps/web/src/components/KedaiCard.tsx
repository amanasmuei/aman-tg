import { Clock, Star, ChevronRight, getMerchantIcon, getAccent } from "../lib/icons";

interface Merchant {
  id: string;
  name: string;
  description: string;
  type: "home_food" | "kedai_makan" | string;
  subcategory: string;
  address: string;
  operating_hours: string; // JSON: {"open":"06:30","close":"11:00","off_days":["sunday"]}
  notes: string;
  price_min: number | null;
  price_max: number | null;
  item_count: number;
  popular_items: { id: string; name: string; price: number }[];
}

interface Props {
  merchant: Merchant;
  onTap: () => void;
}

function getTypeBadge(type: string): string {
  if (type === "home_food") return "Bisnes Rumah";
  if (type === "kedai_makan") return "Kedai Makan";
  return type;
}

function formatPrice(price: number): string {
  return `RM${price.toFixed(2)}`;
}

interface OperatingHours {
  open?: string;
  close?: string;
  off_days?: string[];
}

function isOpenNow(operatingHoursJson: string): boolean {
  try {
    const hours: OperatingHours = JSON.parse(operatingHoursJson);
    if (!hours.open || !hours.close) return false;

    // Get current MY time (UTC+8)
    const now = new Date();
    const myOffset = 8 * 60; // minutes
    const localOffset = now.getTimezoneOffset(); // minutes behind UTC (negative for ahead)
    const myTime = new Date(now.getTime() + (myOffset + localOffset) * 60 * 1000);

    // Check off_days
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDay = dayNames[myTime.getDay()];
    if (hours.off_days && hours.off_days.includes(currentDay)) {
      return false;
    }

    // Parse open/close times as HH:MM
    const [openH, openM] = hours.open.split(":").map(Number);
    const [closeH, closeM] = hours.close.split(":").map(Number);
    const currentMinutes = myTime.getHours() * 60 + myTime.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } catch {
    return false;
  }
}

function formatOperatingHours(operatingHoursJson: string): string {
  try {
    const hours: OperatingHours = JSON.parse(operatingHoursJson);
    if (hours.open && hours.close) {
      return `${hours.open} - ${hours.close}`;
    }
  } catch {}
  return "";
}

export function KedaiCard({ merchant, onTap }: Props) {
  const Icon = getMerchantIcon(merchant.type, merchant.subcategory);
  const accent = getAccent(merchant.type);
  const badge = getTypeBadge(merchant.type);
  const open = isOpenNow(merchant.operating_hours);
  const hoursLabel = formatOperatingHours(merchant.operating_hours);
  const topItems = merchant.popular_items.slice(0, 2);
  const hasPriceRange = merchant.price_min !== null && merchant.price_max !== null;

  return (
    <button
      onClick={onTap}
      className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98] flex items-start gap-3 card-soft"
      style={{ background: "var(--tg-theme-secondary-bg-color)" }}
    >
      {/* Left: icon tile */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent.bg }}
      >
        <Icon size={22} strokeWidth={2} style={{ color: accent.fg }} />
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + type badge */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="font-semibold text-sm truncate"
            style={{ color: "var(--tg-theme-text-color)" }}
          >
            {merchant.name}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold tracking-wide"
            style={{ background: accent.bg, color: accent.fg }}
          >
            {badge}
          </span>
        </div>

        {/* Row 2: Price range + item count */}
        <div className="flex items-center gap-2 mb-1">
          {hasPriceRange ? (
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--tg-theme-text-color)" }}
            >
              {formatPrice(merchant.price_min!)} – {formatPrice(merchant.price_max!)}
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
              Harga tiada
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
            · {merchant.item_count} menu
          </span>
        </div>

        {/* Row 3: Operating hours + open/closed badge */}
        <div className="flex items-center gap-2 mb-1.5">
          {hoursLabel && (
            <span
              className="text-xs inline-flex items-center gap-1"
              style={{ color: "var(--tg-theme-hint-color)" }}
            >
              <Clock size={11} strokeWidth={2.2} />
              {hoursLabel}
            </span>
          )}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 tracking-wide"
            style={{
              background: open ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: open ? "#22c55e" : "#ef4444",
            }}
          >
            {open ? "BUKA" : "TUTUP"}
          </span>
        </div>

        {/* Row 4: Popular items as pills */}
        {topItems.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {topItems.map((item) => (
              <span
                key={item.id}
                className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: "var(--tg-theme-bg-color)",
                  color: "var(--tg-theme-hint-color)",
                }}
              >
                <Star size={10} fill="currentColor" />
                {item.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight
        size={18}
        className="flex-shrink-0 self-center"
        style={{ color: "var(--tg-theme-hint-color)" }}
      />
    </button>
  );
}
