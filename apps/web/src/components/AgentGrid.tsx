import { useState } from "react";
import { AGENTS, AGENT_CATEGORIES } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";
import { AgentCard } from "./AgentCard";

interface Props {
  onSelect: (agent: Agent) => void;
}

export function AgentGrid({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = activeCategory === "all"
    ? AGENTS
    : AGENTS.filter((a) => a.category === activeCategory);

  return (
    <div className="flex-1 px-4 pb-6">
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {AGENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: activeCategory === cat.id
                ? "var(--tg-theme-button-color)"
                : "var(--tg-theme-secondary-bg-color)",
              color: activeCategory === cat.id
                ? "var(--tg-theme-button-text-color)"
                : "var(--tg-theme-text-color)",
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
