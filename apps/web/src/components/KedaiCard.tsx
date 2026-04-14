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
      className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98] flex items-start gap-3 card-night"
    >
      {/* Left: icon tile */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: accent.bg,
          boxShadow: `0 6px 22px -12px ${accent.fg}`,
        }}
      >
        <Icon size={22} strokeWidth={2} style={{ color: accent.fg }} />
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + type badge */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="display truncate"
            style={{
              color: "var(--paper)",
              fontSize: "15px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {merchant.name}
          </span>
          <span
            className="mono text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold"
            style={{
              background: accent.bg,
              color: accent.fg,
              letterSpacing: "0.06em",
            }}
          >
            {badge.toUpperCase()}
          </span>
        </div>

        {/* Row 2: Price range + item count */}
        <div className="flex items-center gap-2 mb-1">
          {hasPriceRange ? (
            <span
              className="mono text-[11px] font-semibold"
              style={{ color: "var(--paper)" }}
            >
              {formatPrice(merchant.price_min!)}–{formatPrice(merchant.price_max!)}
            </span>
          ) : (
            <span
              className="text-xs"
              style={{ color: "var(--paper-3)" }}
            >
              Harga tiada
            </span>
          )}
          <span
            className="mono text-[11px]"
            style={{ color: "var(--paper-3)" }}
          >
            · {merchant.item_count} menu
          </span>
        </div>

        {/* Row 3: Operating hours + open/closed badge */}
        <div className="flex items-center gap-2 mb-1.5">
          {hoursLabel && (
            <span
              className="mono text-[10px] inline-flex items-center gap-1"
              style={{
                color: "var(--paper-3)",
                letterSpacing: "0.02em",
              }}
            >
              <Clock size={11} strokeWidth={2.2} />
              {hoursLabel}
            </span>
          )}
          <span
            className="mono text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{
              background: open
                ? "color-mix(in srgb, var(--forest) 22%, transparent)"
                : "color-mix(in srgb, var(--ember) 18%, transparent)",
              color: open ? "var(--forest)" : "var(--ember)",
              letterSpacing: "0.08em",
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
                className="text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: "var(--ink-3)",
                  color: "var(--paper-2)",
                }}
              >
                <Star
                  size={9}
                  fill="var(--sun)"
                  stroke="var(--sun)"
                />
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
        style={{ color: "var(--paper-3)" }}
      />
    </button>
  );
}
