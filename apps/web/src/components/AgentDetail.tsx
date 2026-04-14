import type { Agent } from "@aman-tg/shared";
import { JiranMerchantSection } from "./JiranMerchantSection";

const EXAMPLE_PROMPTS: Record<string, string[]> = {
  coding: ["Fix this React hook", "Write a REST API in Node.js", "Explain async/await"],
  daily: ["Plan my day", "Create a weekly meal prep schedule", "Help me prioritize tasks"],
  study: ["Explain quantum physics simply", "Quiz me on JavaScript", "Help me understand calculus"],
  creative: ["Write a short story about AI", "Brainstorm app ideas", "Help me name my startup"],
  bizhelper: ["Draft a proposal email", "Analyze this market", "Write meeting minutes"],
  debug: ["My app crashes on login", "Memory leak in production", "API returning 500 errors"],
  fitness: ["Beginner workout plan", "High protein meal ideas", "How to improve sleep"],
  finance: ["Help me budget RM5000/month", "Explain EPF vs unit trust", "How to start investing"],
  bahasa: ["Ajar saya tatabahasa", "Bantu tulis karangan", "Translate this to BM"],
  recipe: ["Nasi lemak recipe", "Quick dinner ideas", "Meal prep for the week"],
  travel: ["3-day Langkawi itinerary", "Budget trip to Bangkok", "Best time to visit Japan"],
  resume: ["Review my resume", "Write a cover letter", "Improve my LinkedIn summary"],
  quran: ["Tafsir Surah Al-Fatihah", "Dua for morning", "Explain Surah Al-Mulk"],
  jiran: ["Tapau nasi lemak untuk 2", "Apa kedai buka sekarang?", "Order kek coklat"],
  todo: ["Add task: call mom", "What are my tasks today?", "Mark laundry as done"],
};

interface Props {
  agent: Agent;
  onStartChat: () => void;
  onBack: () => void;
  userPlan?: string;
  onSelectMerchant?: (merchantId: string, merchantName: string) => void;
}

export function AgentDetail({
  agent,
  onStartChat,
  onBack,
  userPlan = "free",
  onSelectMerchant,
}: Props) {
  const locked = agent.premium && userPlan === "free";
  const examples = EXAMPLE_PROMPTS[agent.id] || ["Hello!", "Help me with something", "Tell me about yourself"];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
           style={{ borderColor: "var(--tg-theme-secondary-bg-color)", background: "var(--tg-theme-bg-color)" }}>
        <button onClick={onBack} className="text-lg p-1">←</button>
        <div className="font-semibold text-sm">Agent Details</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="text-center px-6 pt-8 pb-6">
          <div className="text-5xl mb-3">{agent.icon}</div>
          <h1 className="text-xl font-bold mb-1 flex items-center justify-center gap-2">
            {agent.name}
            {agent.premium && <span className="text-sm">⭐</span>}
          </h1>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            {agent.description}
          </p>
          <div className="flex gap-2 justify-center mt-3 flex-wrap">
            {agent.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-1 rounded-full"
                    style={{ background: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-hint-color)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div className="px-4 pb-4">
          <div className="rounded-xl p-4" style={{ background: "var(--tg-theme-secondary-bg-color)" }}>
            <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--tg-theme-hint-color)" }}>
              Personality
            </h2>
            <p className="text-sm leading-relaxed">{agent.personality}</p>
            <h2 className="text-xs font-semibold uppercase mt-3 mb-2" style={{ color: "var(--tg-theme-hint-color)" }}>
              Style
            </h2>
            <p className="text-sm leading-relaxed">{agent.style}</p>
          </div>
        </div>

        {/* Example prompts */}
        <div className="px-4 pb-4">
          <h2 className="text-xs font-semibold uppercase mb-3" style={{ color: "var(--tg-theme-hint-color)" }}>
            Try asking
          </h2>
          <div className="space-y-2">
            {examples.map((prompt) => (
              <button
                key={prompt}
                onClick={locked ? undefined : onStartChat}
                className="w-full text-left rounded-xl px-4 py-3 text-sm transition-transform active:scale-98"
                style={{
                  background: "var(--tg-theme-secondary-bg-color)",
                  opacity: locked ? 0.5 : 1,
                }}
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>

        {/* Jiran's inline merchant section */}
        {agent.id === "jiran" && onSelectMerchant && (
          <>
            <div className="px-4 pb-2">
              <div className="flex items-center gap-3" aria-hidden>
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "color-mix(in srgb, var(--tg-theme-text-color) 10%, transparent)",
                  }}
                />
                <span
                  className="text-[11px] tracking-[0.22em] uppercase"
                  style={{ color: "var(--tg-theme-hint-color)" }}
                >
                  · ✦ ·
                </span>
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "color-mix(in srgb, var(--tg-theme-text-color) 10%, transparent)",
                  }}
                />
              </div>
            </div>
            <JiranMerchantSection onSelectMerchant={onSelectMerchant} />
          </>
        )}

        {/* Share */}
        <div className="px-4 pb-6">
          <button
            onClick={() => {
              const link = `https://t.me/aman_agent_platform_bot?start=agent_${agent.id}`;
              navigator.clipboard.writeText(link);
            }}
            className="w-full rounded-xl px-4 py-3 text-sm text-center"
            style={{ background: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-hint-color)" }}
          >
            Share this agent 🔗
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 py-4 border-t"
           style={{ borderColor: "var(--tg-theme-secondary-bg-color)", background: "var(--tg-theme-bg-color)" }}>
        {locked ? (
          <div className="text-center text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            ⭐ Upgrade to Pro to unlock this agent — use /pro in the bot
          </div>
        ) : (
          <button
            onClick={onStartChat}
            className="w-full rounded-full py-3 text-sm font-semibold transition-transform active:scale-98"
            style={{
              background: "var(--tg-theme-button-color)",
              color: "var(--tg-theme-button-text-color)",
            }}
          >
            Start Chat with {agent.name}
          </button>
        )}
      </div>
    </div>
  );
}
