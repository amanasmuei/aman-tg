import { useState, useEffect } from "react";
import { AgentGrid } from "./components/AgentGrid";
import { ChatView } from "./components/ChatView";
import { ConversationList } from "./components/ConversationList";
import { AgentDetail } from "./components/AgentDetail";
import { Header } from "./components/Header";
import { Landing } from "./components/Landing";
import { Onboarding } from "./components/Onboarding";
import { KedaiList } from "./components/KedaiList";
import { SearchBar } from "./components/SearchBar";
import { detectLocale, t } from "./lib/i18n";
import { AGENTS } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";
import { Store, Briefcase, MessageCircle, Gift, ChevronRight } from "./lib/icons";

type Page = "home" | "chat" | "detail" | "history";
type HomeTab = "kedai" | "pakar";

interface HasConversationsResult {
  any: boolean;
}

export function App() {
  detectLocale();
  const [page, setPage] = useState<Page>("home");
  const [homeTab, setHomeTab] = useState<HomeTab>("kedai");
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >();
  const [selectedMerchant, setSelectedMerchant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [userPlan, setUserPlan] = useState("free");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasConversations, setHasConversations] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    // Load user — decides onboarding + plan
    fetch(`/api/users/me?telegramId=${telegramId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) setUserPlan(data.plan);
        else setShowOnboarding(true);
      })
      .catch(() => {
        setShowOnboarding(true);
      });

    // Decide whether to show the "Continue a conversation" chip
    fetch(`/api/conversations?telegramId=${telegramId}&limit=1`)
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data: { conversations?: unknown[] } | HasConversationsResult) => {
        if ("any" in data) {
          setHasConversations(data.any);
        } else if (
          data &&
          Array.isArray((data as { conversations?: unknown[] }).conversations)
        ) {
          setHasConversations(
            (data as { conversations: unknown[] }).conversations.length > 0,
          );
        }
      })
      .catch(() => {
        /* chip stays hidden on error */
      });
  }, []);

  // Reset search when switching tabs — search semantics differ per tab
  useEffect(() => {
    setSearch("");
  }, [homeTab]);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setSelectedConversationId(undefined);
    setPage("detail");
  };

  const handleStartChat = () => {
    setSelectedConversationId(undefined);
    setPage("chat");
  };

  const handleSelectConversation = (agentId: string, conversationId: string) => {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setSelectedConversationId(conversationId);
      setPage("chat");
    }
  };

  const handleBack = () => {
    setSelectedAgent(null);
    setSelectedConversationId(undefined);
    setSelectedMerchant(null);
    setPage("home");
  };

  const handleSelectMerchant = (merchantId: string, merchantName: string) => {
    const jiran = AGENTS.find((a) => a.id === "jiran");
    if (!jiran) return;
    setSelectedMerchant({ id: merchantId, name: merchantName });
    setSelectedAgent(jiran);
    setSelectedConversationId(undefined);
    setPage("chat");
  };

  const handleOnboardingComplete = (agent: Agent) => {
    setShowOnboarding(false);
    setSelectedAgent(agent);
    setPage("detail");
  };

  const handleInvite = () => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;
    const link = `https://t.me/aman_agent_platform_bot?start=ref_${telegramId}`;
    navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  if (!window.Telegram?.WebApp?.initData) {
    return <Landing />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const searchPlaceholder =
    homeTab === "kedai"
      ? t("searchKedaiPlaceholder")
      : t("searchPakarPlaceholder");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {page === "home" && (
        <>
          <Header />

          {/* Search */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
          />

          {/* Tab segment: Kedai | Pakar */}
          <div className="px-4 mb-3">
            <div
              className="grid grid-cols-2 gap-1 p-1 rounded-2xl"
              style={{ background: "var(--tg-theme-secondary-bg-color)" }}
            >
              <button
                onClick={() => setHomeTab("kedai")}
                className="py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    homeTab === "kedai"
                      ? "var(--tg-theme-bg-color)"
                      : "transparent",
                  color:
                    homeTab === "kedai"
                      ? "var(--tg-theme-text-color)"
                      : "var(--tg-theme-hint-color)",
                  boxShadow:
                    homeTab === "kedai"
                      ? "0 2px 6px rgba(0,0,0,0.25)"
                      : "none",
                }}
              >
                <Store size={16} strokeWidth={2.2} />
                {t("kedai")}
              </button>
              <button
                onClick={() => setHomeTab("pakar")}
                className="py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    homeTab === "pakar"
                      ? "var(--tg-theme-bg-color)"
                      : "transparent",
                  color:
                    homeTab === "pakar"
                      ? "var(--tg-theme-text-color)"
                      : "var(--tg-theme-hint-color)",
                  boxShadow:
                    homeTab === "pakar"
                      ? "0 2px 6px rgba(0,0,0,0.25)"
                      : "none",
                }}
              >
                <Briefcase size={16} strokeWidth={2.2} />
                {t("pakar")}
              </button>
            </div>
          </div>

          {/* Invite banner (slim, gradient, dismissable-ish via copy feedback) */}
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
                <Gift size={16} strokeWidth={2.2} style={{ color: "#f59e0b" }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div
                  className="text-xs font-semibold leading-tight"
                  style={{ color: "var(--tg-theme-text-color)" }}
                >
                  {inviteCopied ? t("copied") : t("inviteFriends")}
                </div>
                <div
                  className="text-[11px] leading-tight mt-0.5"
                  style={{ color: "var(--tg-theme-hint-color)" }}
                >
                  {t("inviteReward")}
                </div>
              </div>
              <ChevronRight
                size={16}
                style={{ color: "var(--tg-theme-hint-color)" }}
              />
            </button>
          </div>

          {/* Content */}
          {homeTab === "kedai" ? (
            <KedaiList
              onSelectMerchant={handleSelectMerchant}
              onSwitchToPakar={() => setHomeTab("pakar")}
              searchQuery={search}
            />
          ) : (
            <AgentGrid
              onSelect={handleSelectAgent}
              userPlan={userPlan}
              searchQuery={search}
            />
          )}

          {/* Floating "Continue a conversation" chip — only if there's history */}
          {hasConversations && (
            <button
              onClick={() => setPage("history")}
              className="fixed left-1/2 -translate-x-1/2 z-40 rounded-full px-5 py-3 flex items-center gap-2 text-sm font-semibold transition-transform active:scale-95 fade-in"
              style={{
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
                background: "var(--tg-theme-button-color)",
                color: "var(--tg-theme-button-text-color)",
                boxShadow:
                  "0 10px 30px -4px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              <MessageCircle size={16} strokeWidth={2.2} />
              {t("continueConversation")}
            </button>
          )}
        </>
      )}

      {page === "chat" && selectedAgent && (
        <ChatView
          agent={selectedAgent}
          onBack={handleBack}
          conversationId={selectedConversationId}
          initialMerchantId={selectedMerchant?.id}
          initialMerchantName={selectedMerchant?.name}
        />
      )}

      {page === "detail" && selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          onStartChat={handleStartChat}
          onBack={handleBack}
          userPlan={userPlan}
        />
      )}

      {page === "history" && (
        <ConversationList
          onSelect={handleSelectConversation}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
