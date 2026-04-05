import { useState, useEffect } from "react";
import { AgentGrid } from "./components/AgentGrid";
import { ChatView } from "./components/ChatView";
import { ConversationList } from "./components/ConversationList";
import { AgentDetail } from "./components/AgentDetail";
import { Header } from "./components/Header";
import { AGENTS } from "@aman-tg/shared";
import type { Agent } from "@aman-tg/shared";

type Page = "home" | "chat" | "detail" | "history";

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [userPlan, setUserPlan] = useState("free");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    fetch(`/api/users/me?telegramId=${telegramId}`)
      .then((res) => res.json())
      .then((data) => { if (data.plan) setUserPlan(data.plan); })
      .catch(() => {});
  }, []);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setPage("detail");
  };

  const handleStartChat = () => {
    setPage("chat");
  };

  const handleSelectConversation = (agentId: string) => {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setPage("chat");
    }
  };

  const handleBack = () => {
    setPage("home");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {page === "home" && (
        <>
          <Header />
          {/* History button */}
          <div className="px-4 pb-3">
            <button
              onClick={() => setPage("history")}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 transition-transform active:scale-98"
              style={{ background: "var(--tg-theme-secondary-bg-color)" }}
            >
              <span>💬</span>
              <span>Continue a conversation</span>
              <span className="ml-auto" style={{ color: "var(--tg-theme-hint-color)" }}>›</span>
            </button>
          </div>
          <AgentGrid onSelect={handleSelectAgent} userPlan={userPlan} />
        </>
      )}
      {page === "chat" && selectedAgent && (
        <ChatView agent={selectedAgent} onBack={handleBack} />
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
