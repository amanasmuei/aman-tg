import { useState } from "react";
import { AgentGrid } from "./components/AgentGrid";
import { ChatView } from "./components/ChatView";
import { Header } from "./components/Header";
import type { Agent } from "@aman-tg/shared";

type Page = "home" | "chat";

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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
          <AgentGrid onSelect={handleSelectAgent} />
        </>
      )}
      {page === "chat" && selectedAgent && (
        <ChatView agent={selectedAgent} onBack={handleBack} />
      )}
    </div>
  );
}
