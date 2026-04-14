import { useState, useEffect } from "react";
import { AgentGrid } from "./components/AgentGrid";
import { ChatView } from "./components/ChatView";
import { Sembang } from "./components/Sembang";
import { AgentDetail } from "./components/AgentDetail";
import { Header } from "./components/Header";
import { Landing } from "./components/Landing";
import { Onboarding } from "./components/Onboarding";
import { SearchBar } from "./components/SearchBar";
import { BottomNav, type Tab } from "./components/BottomNav";
import { ResumeStrip } from "./components/ResumeStrip";
import { detectLocale, t } from "./lib/i18n";
import { useTelegramId } from "./lib/useTelegramId";
import { AGENTS } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";
import { Gift, ChevronRight } from "./lib/icons";

type Stack =
  | { kind: "none" }
  | { kind: "detail"; agent: Agent }
  | {
      kind: "chat";
      agent: Agent;
      conversationId?: string;
      merchant?: { id: string; name: string };
    };

export function App() {
  detectLocale();
  const telegramId = useTelegramId();

  // Orthogonal routing: persistent bottom-nav tab + a push/pop stack on top.
  const [tab, setTab] = useState<Tab>("teman");
  const [stack, setStack] = useState<Stack>({ kind: "none" });

  const [search, setSearch] = useState("");
  const [userPlan, setUserPlan] = useState("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [jiranMerchantCount, setJiranMerchantCount] = useState<number | null>(
    null,
  );
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    if (!telegramId) return;

    fetch(`/api/users/me?telegramId=${telegramId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) {
          setUserPlan(data.plan);
          setPlanExpiresAt(
            typeof data.planExpiresAt === "number" ? data.planExpiresAt : null,
          );
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        setShowOnboarding(true);
      });
  }, [telegramId]);

  // Jiran merchant count — drives the pill on Jiran's agent card.
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/merchants", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : { merchants: [] }))
      .then((data) => setJiranMerchantCount((data.merchants ?? []).length))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  const openDetail = (agent: Agent) => setStack({ kind: "detail", agent });

  const openChat = (
    agent: Agent,
    conversationId?: string,
    merchant?: { id: string; name: string },
  ) => setStack({ kind: "chat", agent, conversationId, merchant });

  const popStack = () => setStack({ kind: "none" });

  const handleSelectConversation = (
    agentId: string,
    conversationId: string,
  ) => {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent) openChat(agent, conversationId);
  };

  const handleSelectMerchant = (merchantId: string, merchantName: string) => {
    const jiran = AGENTS.find((a) => a.id === "jiran");
    if (!jiran) return;
    openChat(jiran, undefined, { id: merchantId, name: merchantName });
  };

  const handleOnboardingComplete = (agent: Agent) => {
    setShowOnboarding(false);
    openDetail(agent);
  };

  const handleInvite = () => {
    if (!telegramId) return;
    const link = `https://t.me/aman_agent_platform_bot?start=ref_${telegramId}`;
    navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  if (!telegramId) return <Landing />;
  if (showOnboarding)
    return <Onboarding onComplete={handleOnboardingComplete} />;

  if (stack.kind === "chat") {
    return (
      <ChatView
        agent={stack.agent}
        onBack={popStack}
        conversationId={stack.conversationId}
        initialMerchantId={stack.merchant?.id}
        initialMerchantName={stack.merchant?.name}
      />
    );
  }
  if (stack.kind === "detail") {
    return (
      <AgentDetail
        agent={stack.agent}
        onStartChat={() => openChat(stack.agent)}
        onBack={popStack}
        userPlan={userPlan}
        onSelectMerchant={handleSelectMerchant}
      />
    );
  }

  return (
    <div
      className="with-bottom-nav-gutter"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {tab === "teman" && (
        <>
          <Header />

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t("searchUnifiedPlaceholder")}
          />

          {/* Invite banner — free or expiring-pro only */}
          {(() => {
            const isFree = userPlan === "free";
            const isExpiringPro =
              userPlan === "pro" && planExpiresAt !== null;
            if (!isFree && !isExpiringPro) return null;

            const title = inviteCopied
              ? t("copied")
              : isFree
                ? t("inviteFriends")
                : t("inviteExtendPro");
            const subtitle = isFree
              ? t("inviteReward")
              : t("inviteExtendProReward");

            return (
              <div className="px-4 mb-3">
                <button
                  onClick={handleInvite}
                  className="w-full rounded-2xl px-4 py-2.5 flex items-center gap-3 transition-transform active:scale-[0.98]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.04) 70%), var(--tg-theme-secondary-bg-color)",
                    border: "1px solid rgba(245,158,11,0.25)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.22)" }}
                  >
                    <Gift
                      size={16}
                      strokeWidth={2.2}
                      style={{ color: "#f59e0b" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div
                      className="text-xs font-semibold leading-tight"
                      style={{ color: "var(--tg-theme-text-color)" }}
                    >
                      {title}
                    </div>
                    <div
                      className="text-[11px] leading-tight mt-0.5"
                      style={{ color: "var(--tg-theme-hint-color)" }}
                    >
                      {subtitle}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    style={{ color: "var(--tg-theme-hint-color)" }}
                  />
                </button>
              </div>
            );
          })()}

          <ResumeStrip onSelect={handleSelectConversation} />

          <AgentGrid
            onSelect={openDetail}
            userPlan={userPlan}
            searchQuery={search}
            jiranMerchantCount={jiranMerchantCount ?? undefined}
          />
        </>
      )}

      {tab === "sembang" && (
        <Sembang
          onSelect={handleSelectConversation}
          onGoToTeman={() => setTab("teman")}
        />
      )}

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
