import { useState, useEffect } from "react";
import { KedaiCard } from "./KedaiCard";

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

interface Props {
  onSelectMerchant: (merchantId: string, merchantName: string) => void;
}

type FilterType = "all" | "home_food" | "kedai_makan";

const FILTER_CHIPS: { id: FilterType; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "home_food", label: "🏠 Bisnes Rumah" },
  { id: "kedai_makan", label: "🍛 Kedai Makan" },
];

export function KedaiList({ onSelectMerchant }: Props) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/merchants", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setMerchants(data.merchants ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filtered =
    activeFilter === "all"
      ? merchants
      : merchants.filter((m) => m.type === activeFilter);

  if (loading) {
    return (
      <div className="flex-1 px-4 pb-6">
        {/* Filter chips skeleton */}
        <div className="flex gap-2 mb-4">
          {FILTER_CHIPS.map((chip) => (
            <div
              key={chip.id}
              className="h-8 w-24 rounded-full animate-pulse"
              style={{ background: "var(--tg-theme-secondary-bg-color)" }}
            />
          ))}
        </div>
        {/* Card skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full h-24 rounded-xl animate-pulse"
              style={{ background: "var(--tg-theme-secondary-bg-color)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 px-4 pb-6 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="text-4xl mb-3">😅</div>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            Oops, tak boleh load kedai. Try refresh?
          </p>
          <button
            onClick={() => {
              setError(false);
              setLoading(true);
              fetch("/api/merchants")
                .then((res) => res.json())
                .then((data) => {
                  setMerchants(data.merchants ?? []);
                  setLoading(false);
                })
                .catch(() => {
                  setError(true);
                  setLoading(false);
                });
            }}
            className="mt-4 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
          >
            Cuba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 pb-6">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background:
                activeFilter === chip.id
                  ? "var(--tg-theme-button-color)"
                  : "var(--tg-theme-secondary-bg-color)",
              color:
                activeFilter === chip.id
                  ? "var(--tg-theme-button-text-color)"
                  : "var(--tg-theme-text-color)",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Merchant cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            Belum ada kedai hari ni. Check balik nanti!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((merchant) => (
            <KedaiCard
              key={merchant.id}
              merchant={merchant}
              onTap={() => onSelectMerchant(merchant.id, merchant.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
