import { useState } from "react";
import { AGENTS } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";
import { t } from "../lib/i18n";
import { getAgentIcon, getAccent } from "../lib/icons";
import { tap, selectionChange } from "../lib/haptics";

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex gap-2 justify-center mb-10">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all duration-300"
          style={{
            width: i === current ? "32px" : "12px",
            background: i <= current ? "var(--terra)" : "var(--ink-2)",
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  onComplete: (agent: Agent) => void;
}

export function Onboarding({ onComplete }: Props) {
  const INTERESTS = [
    { id: "coding", label: t("codingTech"), icon: "💻" },
    { id: "education", label: t("learningStudy"), icon: "📚" },
    { id: "business", label: t("businessCareer"), icon: "💼" },
    { id: "lifestyle", label: t("lifestyleWellness"), icon: "🌟" },
    { id: "personal", label: t("personalCreative"), icon: "✨" },
    { id: "islamic", label: t("islamicQuran"), icon: "🕌" },
  ];

  const [step, setStep] = useState<"welcome" | "interests" | "recommendation">("welcome");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recommended, setRecommended] = useState<Agent[]>([]);

  const handleInterestToggle = (id: string) => {
    selectionChange();
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleContinue = () => {
    tap("light");
    const categoryMap: Record<string, string[]> = {
      coding: ["coding"],
      education: ["education"],
      business: ["business"],
      lifestyle: ["lifestyle"],
      personal: ["personal"],
      islamic: ["education"],
    };

    const targetCategories = new Set<string>();
    for (const interest of selected) {
      const cats = categoryMap[interest] || [];
      for (const c of cats) targetCategories.add(c);
    }

    const wantIslamic = selected.has("islamic");
    let recs = AGENTS.filter((a) => !a.premium && targetCategories.has(a.category));
    if (wantIslamic) {
      const quran = AGENTS.find((a) => a.id === "quran");
      if (quran && !recs.find((r) => r.id === "quran")) recs.push(quran);
    }
    if (recs.length < 2) {
      const defaults = AGENTS.filter((a) => !a.premium && !recs.find((r) => r.id === a.id));
      recs = [...recs, ...defaults].slice(0, 3);
    }

    setRecommended(recs.slice(0, 3));
    setStep("recommendation");
  };

  if (step === "welcome") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "var(--ink-0)" }}
      >
        <StepIndicator current={0} />
        <div className="mb-5" aria-hidden>
          <span
            className="display"
            style={{
              color: "var(--sun)",
              fontSize: "48px",
              letterSpacing: "0.3em",
            }}
          >
            · ✦ ·
          </span>
        </div>
        <h1
          className="display display-soft mb-3"
          style={{
            color: "var(--paper)",
            fontSize: "40px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          {t("welcomeTo")}
        </h1>
        <p
          className="text-[15px] mb-10 leading-relaxed max-w-xs"
          style={{ color: "var(--paper-2)" }}
        >
          {t("welcomeDesc")}
        </p>
        <button
          onClick={() => {
            tap("medium");
            setStep("interests");
          }}
          className="btn-terra text-sm"
        >
          {t("letsGo")}
        </button>
      </div>
    );
  }

  if (step === "interests") {
    return (
      <div
        className="min-h-screen flex flex-col px-6 pt-12 pb-8"
        style={{ background: "var(--ink-0)" }}
      >
        <StepIndicator current={1} />
        <h2
          className="display mb-2 text-center"
          style={{
            color: "var(--paper)",
            fontSize: "26px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          {t("whatAreYouInto")}
        </h2>
        <p
          className="text-sm text-center mb-8"
          style={{ color: "var(--paper-2)" }}
        >
          {t("pickInterests")}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-10">
          {INTERESTS.map((interest) => {
            const isSelected = selected.has(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => handleInterestToggle(interest.id)}
                className="rounded-2xl p-4 text-left transition-all active:scale-[0.97]"
                style={{
                  background: isSelected ? "var(--terra)" : "var(--ink-2)",
                  color: isSelected ? "var(--ink-0)" : "var(--paper)",
                  border: `1px solid ${isSelected ? "var(--terra)" : "var(--rule)"}`,
                  boxShadow: isSelected
                    ? "0 8px 24px -10px rgba(199, 122, 82, 0.55)"
                    : "none",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xl">{interest.icon}</span>
                  {isSelected && (
                    <span
                      className="mono text-xs font-bold"
                      style={{ color: "var(--ink-0)" }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="display text-sm leading-tight" style={{ fontWeight: 500 }}>
                  {interest.label}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={selected.size === 0}
          className="btn-terra text-sm disabled:opacity-40 disabled:cursor-not-allowed mx-auto"
        >
          {t("showMyAgents")} ({selected.size} {t("selected")})
        </button>
      </div>
    );
  }

  // Recommendation step
  return (
    <div
      className="min-h-screen flex flex-col px-6 pt-12 pb-8"
      style={{ background: "var(--ink-0)" }}
    >
      <StepIndicator current={2} />
      <h2
        className="display mb-2 text-center"
        style={{
          color: "var(--paper)",
          fontSize: "26px",
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        {t("perfectForYou")}
      </h2>
      <p
        className="text-sm text-center mb-8"
        style={{ color: "var(--paper-2)" }}
      >
        {t("basedOnInterests")}
      </p>

      <div className="space-y-3 mb-8">
        {recommended.map((agent) => {
          const Icon = getAgentIcon(agent.id);
          const accent = getAccent(agent.category);
          return (
            <button
              key={agent.id}
              onClick={() => {
                tap("medium");
                onComplete(agent);
              }}
              className="w-full rounded-2xl p-4 text-left transition-transform active:scale-[0.98] flex items-center gap-4 card-night"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: accent.bg,
                  boxShadow: `0 6px 20px -10px ${accent.fg}`,
                }}
              >
                <Icon size={22} strokeWidth={2} style={{ color: accent.fg }} />
              </div>
              <div className="min-w-0">
                <div
                  className="display"
                  style={{
                    color: "var(--paper)",
                    fontSize: "15px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {agent.name}
                </div>
                <p
                  className="text-xs mt-0.5 line-clamp-2"
                  style={{ color: "var(--paper-2)" }}
                >
                  {agent.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => {
          tap("medium");
          onComplete(recommended[0]);
        }}
        className="btn-terra text-sm mx-auto"
      >
        {t("startChatting")}
      </button>

      <button
        onClick={() => onComplete(AGENTS[0])}
        className="text-sm mt-3 mx-auto py-2 sweep-line"
        style={{ color: "var(--paper-3)" }}
      >
        {t("browseAll")}
      </button>
    </div>
  );
}
