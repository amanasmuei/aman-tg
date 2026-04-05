import type { Agent } from "@aman-tg/shared";

interface Props {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

export function AgentCard({ agent, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(agent)}
      className="text-left rounded-xl p-4 transition-transform active:scale-95"
      style={{ background: "var(--tg-theme-secondary-bg-color)" }}
    >
      <div className="text-2xl mb-2">{agent.icon}</div>
      <div className="font-semibold text-sm mb-1 flex items-center gap-1.5">
        {agent.name}
        {agent.premium && <span className="text-xs opacity-60">⭐</span>}
      </div>
      <p className="text-xs leading-relaxed line-clamp-2"
         style={{ color: "var(--tg-theme-hint-color)" }}>
        {agent.description}
      </p>
      <div className="flex gap-1 mt-2 flex-wrap">
        {agent.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--tg-theme-bg-color)", color: "var(--tg-theme-hint-color)" }}>
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
