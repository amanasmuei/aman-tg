import { useEffect, useMemo, useState } from "react";
import { KedaiCard } from "./KedaiCard";
import { Store } from "../lib/icons";
import { t } from "../lib/i18n";

interface Merchant {
  id: string;
  name: string;
  description: string;
  type: "home_food" | "kedai_makan" | string;
  subcategory: string;
  address: string;
  operating_hours: string;
  notes: string;
  price_min: number | null;
  price_max: number | null;
  item_count: number;
  popular_items: { id: string; name: string; price: number }[];
}

type Filter = "all" | "home_food" | "kedai_makan";

const CHIPS: { id: Filter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "home_food", label: "Bisnes Rumah" },
  { id: "kedai_makan", label: "Kedai Makan" },
];

interface Props {
  onSelectMerchant: (id: string, name: string) => void;
}

export function JiranMerchantSection({ onSelectMerchant }: Props) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/merchants", { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error("merchants fetch failed");
        return r.json();
      })
      .then((data) => setMerchants(data.merchants ?? []))
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? merchants
        : merchants.filter((m) => m.type === filter),
    [merchants, filter],
  );

  return (
    <div className="px-4 pb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="kicker-night">{t("jiranKedaiHeading")}</h2>
        {!loading && !error && merchants.length > 0 && (
          <span
            className="mono text-[10px]"
            style={{ color: "var(--paper-3)", letterSpacing: "0.04em" }}
          >
            {t("jiranKedaiCount", { n: merchants.length })}
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {CHIPS.map((c) => {
          const active = filter === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                background: active ? "var(--terra)" : "var(--ink-2)",
                color: active ? "var(--ink-0)" : "var(--paper-2)",
                border: `1px solid ${active ? "var(--terra)" : "var(--rule)"}`,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl animate-pulse"
              style={{ background: "var(--ink-2)" }}
            />
          ))}
        </div>
      )}
      {error && (
        <p
          className="text-sm text-center py-6"
          style={{ color: "var(--paper-3)" }}
        >
          {t("somethingWrong")}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "var(--ink-2)" }}
          >
            <Store
              size={22}
              strokeWidth={1.6}
              style={{ color: "var(--paper-3)" }}
            />
          </div>
          <p className="text-sm" style={{ color: "var(--paper-3)" }}>
            {t("jiranKedaiEmpty")}
          </p>
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((m) => (
            <KedaiCard
              key={m.id}
              merchant={m}
              onTap={() => onSelectMerchant(m.id, m.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
