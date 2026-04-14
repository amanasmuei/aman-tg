import type { Agent } from "@aman-tg/shared";
import { JiranMerchantSection } from "./JiranMerchantSection";
import { getAgentIcon, getAccent, ChevronRight, Star, Lock } from "../lib/icons";
import { t } from "../lib/i18n";
import { tap } from "../lib/haptics";

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
  const examples =
    EXAMPLE_PROMPTS[agent.id] || [
      "Hello!",
      "Help me with something",
      "Tell me about yourself",
    ];
  const Icon = getAgentIcon(agent.id);
  const accent = getAccent(agent.category);

  return (
    <div
      className="flex flex-col h-screen stack-push"
      style={{ background: "var(--ink-0)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <button
          onClick={() => {
            tap("light");
            onBack();
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: "var(--ink-2)",
            border: "1px solid var(--rule)",
            color: "var(--paper)",
          }}
          aria-label="Back"
        >
          ←
        </button>
        <div
          className="mono text-[11px]"
          style={{ color: "var(--paper-3)", letterSpacing: "0.18em" }}
        >
          {t("agentDetails").toUpperCase()}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-6 pt-10 pb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: accent.bg,
              boxShadow: `0 12px 32px -12px ${accent.fg}`,
            }}
          >
            <Icon size={30} strokeWidth={2} style={{ color: accent.fg }} />
          </div>
          <h1
            className="display display-soft flex items-center gap-2"
            style={{
              color: "var(--paper)",
              fontSize: "34px",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              marginBottom: "4px",
            }}
          >
            {agent.name}
            {agent.premium && (
              <Star
                size={18}
                fill="var(--sun)"
                stroke="var(--sun)"
                className="flex-shrink-0"
              />
            )}
            {locked && (
              <Lock size={16} style={{ color: "var(--paper-3)" }} />
            )}
          </h1>
          <div
            className="mono text-[12px] mb-4"
            style={{ color: "var(--paper-3)", letterSpacing: "0.02em" }}
          >
            @{agent.id}
          </div>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: "var(--paper-2)" }}
          >
            {agent.description}
          </p>
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="mono text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--ink-2)",
                  color: "var(--paper-3)",
                  letterSpacing: "0.02em",
                  border: "1px solid var(--rule)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Personality / Style */}
        <div className="px-4 pb-4">
          <div
            className="rounded-2xl p-4 card-night"
            style={{ background: "var(--ink-2)" }}
          >
            <h2 className="kicker-night mb-2">{t("personality")}</h2>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: "var(--paper)" }}
            >
              {agent.personality}
            </p>
            <h2 className="kicker-night mb-2">{t("style")}</h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--paper)" }}
            >
              {agent.style}
            </p>
          </div>
        </div>

        {/* Example prompts */}
        <div className="px-4 pb-4">
          <h2 className="kicker-night mb-3 px-1">{t("tryAsking")}</h2>
          <div className="space-y-2">
            {examples.map((prompt) => (
              <button
                key={prompt}
                onClick={
                  locked
                    ? undefined
                    : () => {
                        tap("light");
                        onStartChat();
                      }
                }
                className="w-full text-left rounded-2xl px-4 py-3 text-sm transition-transform active:scale-[0.98] flex items-center justify-between gap-2 card-night"
                style={{
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <span
                  className="display italic"
                  style={{
                    color: "var(--paper)",
                    fontSize: "14px",
                    fontWeight: 400,
                  }}
                >
                  “{prompt}”
                </span>
                <ChevronRight
                  size={14}
                  style={{ color: "var(--paper-3)" }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Jiran's inline merchant section */}
        {agent.id === "jiran" && onSelectMerchant && (
          <>
            <div className="px-4 pb-3 pt-1">
              <div className="ornament-night">
                <span className="ornament-night-glyph">· ✦ ·</span>
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
              tap("light");
            }}
            className="btn-ghost-night w-full text-sm"
          >
            {t("shareAgent")}
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="px-4 py-4"
        style={{
          borderTop: "1px solid var(--rule)",
          background: "var(--ink-0)",
        }}
      >
        {locked ? (
          <div
            className="text-center text-sm"
            style={{ color: "var(--paper-3)" }}
          >
            <Star
              size={14}
              fill="var(--sun)"
              stroke="var(--sun)"
              className="inline align-text-bottom mr-1"
            />
            {t("premiumRequired")}
          </div>
        ) : (
          <button
            onClick={() => {
              tap("medium");
              onStartChat();
            }}
            className="btn-terra w-full text-sm"
          >
            {t("startChat")} {agent.name}
          </button>
        )}
      </div>
    </div>
  );
}
