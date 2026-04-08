import { useState, useEffect, useMemo } from "react";
import { KedaiCard } from "./KedaiCard";
import { Store, Briefcase } from "../lib/icons";
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

interface Props {
  onSelectMerchant: (merchantId: string, merchantName: string) => void;
  onSwitchToPakar?: () => void;
  searchQuery?: string;
}

type FilterType = "all" | "home_food" | "kedai_makan";

const FILTER_CHIPS: { id: FilterType; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "home_food", label: "Bisnes Rumah" },
  { id: "kedai_makan", label: "Kedai Makan" },
];

export function KedaiList({ onSelectMerchant, onSwitchToPakar, searchQuery = "" }: Props) {
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

  // Count badges per filter reflect the effective search scope
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return merchants;
    return merchants.filter((m) => {
      const haystack = [
        m.name,
        m.description,
        m.subcategory,
        ...m.popular_items.map((i) => i.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [merchants, searchQuery]);

  const counts = useMemo(() => {
    const by = (type: FilterType) =>
      type === "all"
        ? searchMatches.length
        : searchMatches.filter((m) => m.type === type).length;
    return {
      all: by("all"),
      home_food: by("home_food"),
      kedai_makan: by("kedai_makan"),
    };
  }, [searchMatches]);

  const filtered =
    activeFilter === "all"
      ? searchMatches
      : searchMatches.filter((m) => m.type === activeFilter);

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
              className="w-full h-24 rounded-2xl animate-pulse"
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
            style={{
              background: "var(--tg-theme-button-color)",
              color: "var(--tg-theme-button-text-color)",
            }}
          >
            Cuba Lagi
          </button>
        </div>
      </div>
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex-1 px-4 pb-6">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {FILTER_CHIPS.map((chip) => {
          const active = activeFilter === chip.id;
          const count = counts[chip.id];
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all inline-flex items-center gap-1.5"
              style={{
                background: active
                  ? "var(--tg-theme-button-color)"
                  : "var(--tg-theme-secondary-bg-color)",
                color: active
                  ? "var(--tg-theme-button-text-color)"
                  : "var(--tg-theme-text-color)",
              }}
            >
              {chip.label}
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{
                  background: active
                    ? "rgba(255,255,255,0.22)"
                    : "var(--tg-theme-bg-color)",
                  color: active
                    ? "var(--tg-theme-button-text-color)"
                    : "var(--tg-theme-hint-color)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Merchant cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 px-6 fade-in">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--tg-theme-secondary-bg-color)" }}
          >
            <Store
              size={28}
              strokeWidth={1.8}
              style={{ color: "var(--tg-theme-hint-color)" }}
            />
          </div>
          <p
            className="text-base font-semibold mb-1"
            style={{ color: "var(--tg-theme-text-color)" }}
          >
            {isSearching ? t("noSearchResults") : t("noMerchantsToday")}
          </p>
          <p
            className="text-sm mb-5"
            style={{ color: "var(--tg-theme-hint-color)" }}
          >
            {isSearching ? t("noSearchHint") : t("noMerchantsHint")}
          </p>
          {onSwitchToPakar && !isSearching && (
            <button
              onClick={onSwitchToPakar}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-transform active:scale-95"
              style={{
                background: "var(--tg-theme-button-color)",
                color: "var(--tg-theme-button-text-color)",
              }}
            >
              <Briefcase size={16} strokeWidth={2.2} />
              {t("tryPakar")}
            </button>
          )}
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
