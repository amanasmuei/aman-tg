import { useState, useRef, useEffect } from "react";
import type { Agent, ChatMessage } from "@aman-tg/shared";

interface Props {
  agent: Agent;
  onBack: () => void;
}

export function ChatView({ agent, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
      agentId: agent.id,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const initData = window.Telegram?.WebApp?.initData || "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({
          agentId: agent.id,
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        agentId: agent.id,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: assistantText } : m
            )
          );
        }
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: Date.now(),
        agentId: agent.id,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
           style={{ borderColor: "var(--tg-theme-secondary-bg-color)", background: "var(--tg-theme-bg-color)" }}>
        <button onClick={onBack} className="text-lg p-1">←</button>
        <span className="text-xl">{agent.icon}</span>
        <div className="flex-1">
          <div className="font-semibold text-sm">{agent.name}</div>
          <div className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>{agent.personality}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">{agent.icon}</div>
            <div className="font-semibold mb-1">{agent.name}</div>
            <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
              {agent.description}
            </p>
            <p className="text-xs mt-3" style={{ color: "var(--tg-theme-hint-color)" }}>
              Send a message to start chatting
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}
               className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                 style={{
                   background: msg.role === "user"
                     ? "var(--tg-theme-button-color)"
                     : "var(--tg-theme-secondary-bg-color)",
                   color: msg.role === "user"
                     ? "var(--tg-theme-button-text-color)"
                     : "var(--tg-theme-text-color)",
                   borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                   borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
                 }}>
              {msg.content || (loading ? "..." : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t"
           style={{ borderColor: "var(--tg-theme-secondary-bg-color)", background: "var(--tg-theme-bg-color)" }}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--tg-theme-secondary-bg-color)",
              color: "var(--tg-theme-text-color)",
            }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold transition-opacity disabled:opacity-30"
            style={{
              background: "var(--tg-theme-button-color)",
              color: "var(--tg-theme-button-text-color)",
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
