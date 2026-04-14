import { useState, useMemo } from "react";
import { AGENTS, AGENT_CATEGORIES } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";
import { AgentCard } from "./AgentCard";
import { getCategoryIcon, Briefcase } from "../lib/icons";
import { t } from "../lib/i18n";

interface Props {
  onSelect: (agent: Agent) => void;
  userPlan?: string;
  searchQuery?: string;
  jiranMerchantCount?: number;
}

export function AgentGrid({
  onSelect,
  userPlan,
  searchQuery = "",
  jiranMerchantCount,
}: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [animating, setAnimating] = useState(false);

  const handleCategoryChange = (catId: string) => {
    setAnimating(true);
    setTimeout(() => {
      setActiveCategory(catId);
      setAnimating(false);
    }, 120);
  };

  // Apply search first, then category filter. Counts reflect what's
  // visible after the search so chip numbers are never misleading.
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return AGENTS;
    return AGENTS.filter((a) => {
      const haystack = [a.name, a.description, ...a.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: searchMatches.length };
    for (const cat of AGENT_CATEGORIES) {
      if (cat.id === "all") continue;
      result[cat.id] = searchMatches.filter((a) => a.category === cat.id).length;
    }
    return result;
  }, [searchMatches]);

  const filtered =
    activeCategory === "all"
      ? searchMatches
      : searchMatches.filter((a) => a.category === activeCategory);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex-1 px-4 pb-6">
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {AGENT_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          const Icon = getCategoryIcon(cat.id);
          const count = counts[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5"
              style={{
                background: active ? "var(--terra)" : "var(--ink-2)",
                color: active ? "var(--ink-0)" : "var(--paper-2)",
                border: `1px solid ${active ? "var(--terra)" : "var(--rule)"}`,
              }}
            >
              {Icon && <Icon size={14} strokeWidth={2.2} />}
              <span>{cat.label}</span>
              <span
                className="mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{
                  background: active ? "rgba(13,11,8,0.25)" : "var(--ink-3)",
                  color: active ? "var(--ink-0)" : "var(--paper-3)",
                  letterSpacing: "0.02em",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Agent cards grid or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 px-6 fade-in">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--ink-2)" }}
          >
            <Briefcase
              size={28}
              strokeWidth={1.6}
              style={{ color: "var(--paper-3)" }}
            />
          </div>
          <p
            className="display text-lg mb-1"
            style={{ color: "var(--paper)" }}
          >
            {isSearching ? t("noSearchResults") : "—"}
          </p>
          <p className="text-sm" style={{ color: "var(--paper-3)" }}>
            {isSearching ? t("noSearchHint") : ""}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 transition-opacity duration-150"
          style={{ opacity: animating ? 0.3 : 1 }}
        >
          {filtered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={onSelect}
              userPlan={userPlan}
              jiranMerchantCount={jiranMerchantCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
