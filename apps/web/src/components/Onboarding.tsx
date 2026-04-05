import { useState } from "react";
import { AGENTS } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";

const INTERESTS = [
  { id: "coding", label: "Coding & Tech", icon: "💻" },
  { id: "education", label: "Learning & Study", icon: "📚" },
  { id: "business", label: "Business & Career", icon: "💼" },
  { id: "lifestyle", label: "Lifestyle & Wellness", icon: "🌟" },
  { id: "personal", label: "Personal & Creative", icon: "✨" },
  { id: "islamic", label: "Islamic & Quran", icon: "🕌" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all duration-300"
          style={{
            width: i === current ? "32px" : "12px",
            background: i <= current ? "var(--tg-theme-button-color)" : "var(--tg-theme-secondary-bg-color)",
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
  const [step, setStep] = useState<"welcome" | "interests" | "recommendation">("welcome");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recommended, setRecommended] = useState<Agent[]>([]);

  const handleInterestToggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleContinue = () => {
    // Map interests to agent categories and recommend
    const categoryMap: Record<string, string[]> = {
      coding: ["coding"],
      education: ["education"],
      business: ["business"],
      lifestyle: ["lifestyle"],
      personal: ["personal"],
      islamic: ["education"], // Quran Companion is in education
    };

    const targetCategories = new Set<string>();
    for (const interest of selected) {
      const cats = categoryMap[interest] || [];
      for (const c of cats) targetCategories.add(c);
    }

    // Special handling for islamic interest
    const wantIslamic = selected.has("islamic");

    let recs = AGENTS.filter((a) => !a.premium && targetCategories.has(a.category));
    if (wantIslamic) {
      const quran = AGENTS.find((a) => a.id === "quran");
      if (quran && !recs.find((r) => r.id === "quran")) recs.push(quran);
    }

    // If no matches or too few, add defaults
    if (recs.length < 2) {
      const defaults = AGENTS.filter((a) => !a.premium && !recs.find((r) => r.id === a.id));
      recs = [...recs, ...defaults].slice(0, 3);
    }

    setRecommended(recs.slice(0, 3));
    setStep("recommendation");
  };

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <StepIndicator current={0} />
        <div className="text-5xl mb-4">🤖</div>
        <h1 className="text-2xl font-bold mb-2">Welcome to aman</h1>
        <p className="text-sm mb-8" style={{ color: "var(--tg-theme-hint-color)" }}>
          Your AI companion that remembers you.
          Let's find the right agents for you.
        </p>
        <button
          onClick={() => setStep("interests")}
          className="rounded-full px-8 py-3 text-sm font-semibold transition-transform active:scale-95"
          style={{ background: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
        >
          Let's Go
        </button>
      </div>
    );
  }

  if (step === "interests") {
    return (
      <div className="min-h-screen flex flex-col px-6 pt-12">
        <StepIndicator current={1} />
        <h2 className="text-xl font-bold mb-2 text-center">What are you into?</h2>
        <p className="text-sm text-center mb-6" style={{ color: "var(--tg-theme-hint-color)" }}>
          Pick your interests — we'll recommend agents for you
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {INTERESTS.map((interest) => {
            const isSelected = selected.has(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => handleInterestToggle(interest.id)}
                className="rounded-xl p-4 text-left transition-all active:scale-95"
                style={{
                  background: isSelected ? "var(--tg-theme-button-color)" : "var(--tg-theme-secondary-bg-color)",
                  color: isSelected ? "var(--tg-theme-button-text-color)" : "var(--tg-theme-text-color)",
                  border: isSelected ? "2px solid var(--tg-theme-button-color)" : "2px solid transparent",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{interest.icon}</span>
                  {isSelected && <span className="text-sm">✓</span>}
                </div>
                <div className="text-sm font-medium mt-1">{interest.label}</div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={selected.size === 0}
          className="rounded-full px-8 py-3 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-30 mx-auto"
          style={{ background: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
        >
          Show My Agents ({selected.size} selected)
        </button>
      </div>
    );
  }

  // Recommendation step
  return (
    <div className="min-h-screen flex flex-col px-6 pt-12">
      <StepIndicator current={2} />
      <h2 className="text-xl font-bold mb-2 text-center">Perfect for you!</h2>
      <p className="text-sm text-center mb-6" style={{ color: "var(--tg-theme-hint-color)" }}>
        Based on your interests, try these agents:
      </p>

      <div className="space-y-3 mb-8">
        {recommended.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onComplete(agent)}
            className="w-full rounded-xl p-4 text-left transition-transform active:scale-95 flex items-center gap-4"
            style={{ background: "var(--tg-theme-secondary-bg-color)" }}
          >
            <span className="text-3xl flex-shrink-0">{agent.icon}</span>
            <div>
              <div className="font-semibold text-sm">{agent.name}</div>
              <p className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint-color)" }}>
                {agent.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => onComplete(recommended[0])}
        className="rounded-full px-8 py-3 text-sm font-semibold transition-transform active:scale-95 mx-auto"
        style={{ background: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
      >
        Start Chatting
      </button>

      <button
        onClick={() => onComplete(AGENTS[0])}
        className="text-sm mt-3 mx-auto py-2"
        style={{ color: "var(--tg-theme-hint-color)" }}
      >
        Skip — browse all agents
      </button>
    </div>
  );
}
