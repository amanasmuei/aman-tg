import type { Agent } from "@aman-tg/shared";
import { getAgentIcon, getAccent, Lock, Star } from "../lib/icons";
import { t } from "../lib/i18n";
import { tap } from "../lib/haptics";

interface Props {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  userPlan?: string;
  /** Jiran-only: shows an "N kedai" pill signalling inline merchant directory. */
  jiranMerchantCount?: number;
}

/**
 * Pakar card — Tactile Night tile.
 *
 * Fraunces agent name, mono @handle, soft accent glow behind the icon,
 * gradient card surface. The whole tile is the tap target.
 */
export function AgentCard({
  agent,
  onSelect,
  userPlan = "free",
  jiranMerchantCount,
}: Props) {
  const locked = agent.premium && userPlan === "free";
  const Icon = getAgentIcon(agent.id);
  const accent = getAccent(agent.category);
  const showJiranPill =
    agent.id === "jiran" &&
    typeof jiranMerchantCount === "number" &&
    jiranMerchantCount > 0;

  return (
    <button
      onClick={() => {
        tap("light");
        onSelect(agent);
      }}
      className="text-left rounded-2xl p-4 transition-transform active:scale-[0.97] relative card-night"
      style={{
        opacity: locked ? 0.72 : 1,
      }}
    >
      {showJiranPill && (
        <span
          className="mono absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "var(--sun)",
            color: "var(--ink-0)",
            letterSpacing: "0.04em",
          }}
        >
          {t("agentCardJiranPill", { n: jiranMerchantCount })}
        </span>
      )}

      {/* Accent tile */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: accent.bg,
          boxShadow: `0 6px 22px -12px ${accent.fg}`,
        }}
      >
        <Icon size={20} strokeWidth={2} style={{ color: accent.fg }} />
      </div>

      {/* Name + badges */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="display truncate"
          style={{
            color: "var(--paper)",
            fontSize: "17px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
          }}
        >
          {agent.name}
        </span>
        {agent.premium && (
          <Star
            size={11}
            fill="var(--sun)"
            stroke="var(--sun)"
            className="flex-shrink-0"
          />
        )}
        {locked && (
          <Lock
            size={11}
            className="flex-shrink-0"
            style={{ color: "var(--paper-3)" }}
          />
        )}
      </div>

      {/* Mono handle */}
      <div
        className="mono text-[10px] mb-2"
        style={{ color: "var(--paper-3)", letterSpacing: "0.02em" }}
      >
        @{agent.id}
      </div>

      {/* Description */}
      <p
        className="text-[12px] leading-relaxed line-clamp-2 mb-2.5"
        style={{ color: "var(--paper-2)" }}
      >
        {locked ? "Upgrade to Pro to unlock" : agent.description}
      </p>

      {/* Tag row */}
      <div className="flex gap-1 flex-wrap">
        {!locked &&
          agent.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="mono text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--ink-3)",
                color: "var(--paper-3)",
                letterSpacing: "0.02em",
              }}
            >
              {tag}
            </span>
          ))}
      </div>
    </button>
  );
}
