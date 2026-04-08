import type { Agent } from "@aman-tg/shared";
import { getAgentIcon, getAccent, Lock, Star } from "../lib/icons";

interface Props {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  userPlan?: string;
}

/**
 * Pakar card — the professional service tile.
 *
 * Layout: icon tile (top-left), name row (with premium/lock badges),
 * description (2 lines), and a pair of meta tags below. The whole card
 * is the tap target; the share affordance lives in the detail page to
 * keep the grid clean.
 */
export function AgentCard({ agent, onSelect, userPlan = "free" }: Props) {
  const locked = agent.premium && userPlan === "free";
  const Icon = getAgentIcon(agent.id);
  const accent = getAccent(agent.category);

  return (
    <button
      onClick={() => onSelect(agent)}
      className="text-left rounded-2xl p-4 transition-transform active:scale-[0.97] relative card-soft"
      style={{
        background: "var(--tg-theme-secondary-bg-color)",
        opacity: locked ? 0.72 : 1,
      }}
    >
      {/* Icon tile */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
        style={{ background: accent.bg }}
      >
        <Icon size={20} strokeWidth={2} style={{ color: accent.fg }} />
      </div>

      {/* Name + badges */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="font-semibold text-sm truncate"
          style={{ color: "var(--tg-theme-text-color)" }}
        >
          {agent.name}
        </span>
        {agent.premium && (
          <Star
            size={12}
            fill="#f59e0b"
            stroke="#f59e0b"
            className="flex-shrink-0"
          />
        )}
        {locked && (
          <Lock
            size={12}
            className="flex-shrink-0"
            style={{ color: "var(--tg-theme-hint-color)" }}
          />
        )}
      </div>

      {/* Description */}
      <p
        className="text-xs leading-relaxed line-clamp-2 mb-2.5"
        style={{ color: "var(--tg-theme-hint-color)" }}
      >
        {locked ? "Upgrade to Pro to unlock" : agent.description}
      </p>

      {/* Tag row */}
      <div className="flex gap-1 flex-wrap">
        {!locked &&
          agent.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "var(--tg-theme-bg-color)",
                color: "var(--tg-theme-hint-color)",
              }}
            >
              {tag}
            </span>
          ))}
      </div>
    </button>
  );
}
