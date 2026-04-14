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
import { KedaiCard } from "./components/KedaiCard";
import { detectLocale, t } from "./lib/i18n";
import { useTelegramId } from "./lib/useTelegramId";
import { tap } from "./lib/haptics";
import {
  filterMerchantsByQuery,
  type SearchableMerchant,
} from "./lib/searchFilters";
import { parseStartParam } from "./lib/startParam";
import { AGENTS } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";
import { Gift, ChevronRight } from "./lib/icons";

interface Merchant extends SearchableMerchant {
  type: "home_food" | "kedai_makan" | string;
  address: string;
  operating_hours: string;
  notes: string;
  price_min: number | null;
  price_max: number | null;
  item_count: number;
}

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
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Deep-link intent (from Telegram's startapp param). Parsed once at mount;
  // a subsequent effect consumes it when the data it needs is available.
  const [pendingDeepLink, setPendingDeepLink] = useState(() => {
    const raw = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    return parseStartParam(raw);
  });

  const jiranMerchantCount = merchants.length;

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

  // Fetch merchants once — drives both the Jiran-card pill and unified search.
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/merchants", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : { merchants: [] }))
      .then((data) => setMerchants(data.merchants ?? []))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  // Consume deep-link intent once the data it needs is available.
  // Stays pending while onboarding shows — first-run always wins over deep
  // links (they apply to returning users opening share URLs).
  useEffect(() => {
    if (!pendingDeepLink || showOnboarding || !telegramId) return;

    if (pendingDeepLink.kind === "ref") {
      setPendingDeepLink(null);
      return;
    }

    if (pendingDeepLink.kind === "agent") {
      const agent = AGENTS.find((a) => a.id === pendingDeepLink.id);
      if (agent) setStack({ kind: "detail", agent });
      setPendingDeepLink(null);
      return;
    }

    if (pendingDeepLink.kind === "kedai") {
      if (merchants.length === 0) return; // wait for merchant list
      const m = merchants.find((x) => x.id === pendingDeepLink.id);
      const jiran = AGENTS.find((a) => a.id === "jiran");
      if (m && jiran) {
        setStack({
          kind: "chat",
          agent: jiran,
          merchant: { id: m.id, name: m.name },
        });
      }
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, showOnboarding, telegramId, merchants]);

  const openDetail = (agent: Agent) => {
    tap("medium");
    setStack({ kind: "detail", agent });
  };

  const openChat = (
    agent: Agent,
    conversationId?: string,
    merchant?: { id: string; name: string },
  ) => {
    tap("medium");
    setStack({ kind: "chat", agent, conversationId, merchant });
  };

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
          <div
            className="reveal-in"
            style={{ ["--reveal-delay" as string]: "0ms" }}
          >
            <Header onInvite={handleInvite} planExpiresAt={planExpiresAt} />
          </div>

          <div
            className="reveal-in"
            style={{ ["--reveal-delay" as string]: "40ms" }}
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t("searchUnifiedPlaceholder")}
            />
          </div>

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
              <div
                className="px-4 mb-3 reveal-in"
                style={{ ["--reveal-delay" as string]: "80ms" }}
              >
                <button
                  onClick={handleInvite}
                  className="w-full rounded-2xl px-4 py-2.5 flex items-center gap-3 transition-transform active:scale-[0.98]"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--sun) 18%, transparent) 0%, color-mix(in srgb, var(--sun) 4%, transparent) 70%), var(--ink-2)",
                    border: "1px solid color-mix(in srgb, var(--sun) 28%, transparent)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "color-mix(in srgb, var(--sun) 22%, transparent)",
                    }}
                  >
                    <Gift
                      size={16}
                      strokeWidth={2.2}
                      style={{ color: "var(--sun)" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div
                      className="text-xs font-semibold leading-tight"
                      style={{ color: "var(--paper)" }}
                    >
                      {title}
                    </div>
                    <div
                      className="text-[11px] leading-tight mt-0.5"
                      style={{ color: "var(--paper-2)" }}
                    >
                      {subtitle}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--paper-3)" }} />
                </button>
              </div>
            );
          })()}

          <div
            className="reveal-in"
            style={{ ["--reveal-delay" as string]: "120ms" }}
          >
            <ResumeStrip onSelect={handleSelectConversation} />
          </div>

          <div
            className="reveal-in"
            style={{ ["--reveal-delay" as string]: "160ms" }}
          >
            <AgentGrid
              onSelect={openDetail}
              userPlan={userPlan}
              searchQuery={search}
              jiranMerchantCount={jiranMerchantCount || undefined}
            />
          </div>

          {/* Unified search: shop matches via Jiran. Renders only when the
              query has actual merchant hits, so a quiet search stays quiet. */}
          {search.trim().length > 0 &&
            (() => {
              const hits = filterMerchantsByQuery(merchants, search);
              if (hits.length === 0) return null;
              return (
                <div className="px-4 mt-2 mb-6">
                  <div className="kicker-night mb-2">
                    {t("searchResultsShops")}
                  </div>
                  <div className="space-y-3">
                    {hits.map((m) => (
                      <KedaiCard
                        key={m.id}
                        merchant={m}
                        onTap={() => handleSelectMerchant(m.id, m.name)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
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
