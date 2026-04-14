import { useState, useEffect } from "react";
import { AgentGrid } from "./components/AgentGrid";
import { ChatView } from "./components/ChatView";
import { Sembang } from "./components/Sembang";
import { AgentDetail } from "./components/AgentDetail";
import { Header } from "./components/Header";
import { Landing } from "./components/Landing";
import { Onboarding } from "./components/Onboarding";
import { KedaiList } from "./components/KedaiList";
import { SearchBar } from "./components/SearchBar";
import { BottomNav, type Tab } from "./components/BottomNav";
import { detectLocale, t } from "./lib/i18n";
import { useTelegramId } from "./lib/useTelegramId";
import { AGENTS } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";
import {
  Store,
  Briefcase,
  MessageCircle,
  Gift,
  ChevronRight,
} from "./lib/icons";

type HomeTab = "kedai" | "pakar";

type Stack =
  | { kind: "none" }
  | { kind: "detail"; agent: Agent }
  | {
      kind: "chat";
      agent: Agent;
      conversationId?: string;
      merchant?: { id: string; name: string };
    };

interface HasConversationsResult {
  any: boolean;
}

export function App() {
  detectLocale();
  const telegramId = useTelegramId();

  // Orthogonal routing: persistent bottom-nav tab + a push/pop stack on top.
  const [tab, setTab] = useState<Tab>("teman");
  const [stack, setStack] = useState<Stack>({ kind: "none" });

  // Teman-only UI state (will shrink in later tasks)
  const [homeTab, setHomeTab] = useState<HomeTab>("kedai");
  const [search, setSearch] = useState("");
  const [userPlan, setUserPlan] = useState("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasConversations, setHasConversations] = useState(false);
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
  }, [telegramId]);

  // Reset search when switching tabs — search semantics differ per tab
  useEffect(() => {
    setSearch("");
  }, [homeTab]);

  const openDetail = (agent: Agent) =>
    setStack({ kind: "detail", agent });

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

  // Stack views take the whole screen — bottom nav hidden.
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

  const searchPlaceholder =
    homeTab === "kedai"
      ? t("searchKedaiPlaceholder")
      : t("searchPakarPlaceholder");

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
            placeholder={searchPlaceholder}
          />

          {/* Tab segment: Kedai | Pakar — removed in Task 6 */}
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

          {/*
           * Invite banner — shown to users who can actually benefit.
           *
           * Visibility matrix (matches apps/api computeReferralReward):
           *   - free               → shown with "Both get 3 days Pro free"
           *   - expiring pro       → shown with "Extend your Pro" copy
           *   - permanent pro      → hidden (nothing to extend)
           *   - team               → hidden (separate business logic)
           */}
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

          {/* Content */}
          {homeTab === "kedai" ? (
            <KedaiList
              onSelectMerchant={handleSelectMerchant}
              onSwitchToPakar={() => setHomeTab("pakar")}
              searchQuery={search}
            />
          ) : (
            <AgentGrid
              onSelect={openDetail}
              userPlan={userPlan}
              searchQuery={search}
            />
          )}

          {/* Floating "Continue a conversation" chip — removed in Task 7 */}
          {hasConversations && (
            <button
              onClick={() => setTab("sembang")}
              className="fixed left-1/2 -translate-x-1/2 z-40 rounded-full px-5 py-3 flex items-center gap-2 text-sm font-semibold transition-transform active:scale-95 fade-in"
              style={{
                bottom:
                  "calc(env(safe-area-inset-bottom, 0px) + 72px)",
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
