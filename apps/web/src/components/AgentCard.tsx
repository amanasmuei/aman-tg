import type { Agent } from "@aman-tg/shared";

interface Props {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  userPlan?: string;
}

export function AgentCard({ agent, onSelect, userPlan = "free" }: Props) {
  const locked = agent.premium && userPlan === "free";

  return (
    <button
      onClick={() => onSelect(agent)}
      className="text-left rounded-xl p-4 transition-transform active:scale-95 relative"
      style={{
        background: "var(--tg-theme-secondary-bg-color)",
        opacity: locked ? 0.7 : 1,
      }}
    >
      <div className="text-2xl mb-2">{agent.icon}</div>
      <div className="font-semibold text-sm mb-1 flex items-center gap-1.5">
        {agent.name}
        {agent.premium && <span className="text-xs">⭐</span>}
        {locked && <span className="text-xs">🔒</span>}
      </div>
      <p className="text-xs leading-relaxed line-clamp-2"
         style={{ color: "var(--tg-theme-hint-color)" }}>
        {locked ? "Upgrade to Pro to unlock" : agent.description}
      </p>
      <div className="flex gap-1 mt-2 flex-wrap">
        {!locked && agent.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--tg-theme-bg-color)", color: "var(--tg-theme-hint-color)" }}>
            {tag}
          </span>
        ))}
      </div>
      <div
        className="mt-2 text-xs text-right opacity-50"
        onClick={(e) => {
          e.stopPropagation();
          const link = `https://t.me/aman_agent_platform_bot?start=agent_${agent.id}`;
          navigator.clipboard.writeText(link).then(() => {
            const el = e.currentTarget;
            el.textContent = "Copied!";
            setTimeout(() => { el.textContent = "Share 🔗"; }, 1500);
          });
        }}
      >
        Share 🔗
      </div>
    </button>
  );
}
