import { useState, useEffect } from "react";
import { AgentGrid } from "./components/AgentGrid";
import { ChatView } from "./components/ChatView";
import { Header } from "./components/Header";
import type { Agent } from "@aman-tg/shared";

type Page = "home" | "chat";

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
    setPage("chat");
  };

  const handleBack = () => {
    setPage("home");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {page === "home" && (
        <>
          <Header />
          <AgentGrid onSelect={handleSelectAgent} userPlan={userPlan} />
        </>
      )}
      {page === "chat" && selectedAgent && (
        <ChatView agent={selectedAgent} onBack={handleBack} />
      )}
    </div>
  );
}
