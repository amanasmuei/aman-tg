import { useState, useRef, useEffect } from "react";
import type { Agent, ChatMessage } from "@aman-tg/shared";
import { Markdown } from "./Markdown";
import { t, getLanguageDirective } from "../lib/i18n";

const QUICK_PROMPTS: Record<string, string[]> = {
  coding: ["Fix a bug", "Write a function", "Explain this code"],
  daily: ["Plan my day", "Create a to-do list", "Set priorities"],
  study: ["Explain simply", "Quiz me", "Help me understand"],
  creative: ["Brainstorm ideas", "Write a story", "Name my project"],
  bizhelper: ["Draft an email", "Business strategy", "Write a proposal"],
  debug: ["App is crashing", "Performance issue", "Strange error"],
  fitness: ["Workout plan", "Meal ideas", "Sleep tips"],
  finance: ["Budget help", "Saving tips", "Investment basics"],
  bahasa: ["Ajar tatabahasa", "Bantu karangan", "Translate this"],
  recipe: ["Quick dinner", "Nasi lemak", "Meal prep ideas"],
  travel: ["Plan a trip", "Budget travel", "Hidden gems"],
  resume: ["Review my resume", "Cover letter", "LinkedIn tips"],
  quran: ["Tafsir surah", "Dua harian", "Tajweed basics"],
  default: ["Help me with something", "Tell me about yourself", "What can you do?"],
};

interface Attachment {
  type: "image" | "file";
  name: string;
  base64: string;
  mediaType: string;
  preview?: string; // data URL for image preview
}

interface Props {
  agent: Agent;
  onBack: () => void;
  conversationId?: string;
}

export function ChatView({ agent, onBack, conversationId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    const controller = new AbortController();
    const historyUrl = conversationId
      ? `/api/conversations/${agent.id}?telegramId=${telegramId}&conversationId=${conversationId}`
      : `/api/conversations/${agent.id}?telegramId=${telegramId}`;
    fetch(historyUrl, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [agent.id]);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert(t("fileTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setAttachment(null);
    };
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<mediaType>;base64,<data>"
      const base64 = result.split(",")[1] ?? "";
      if (!base64) return;
      const mediaType = file.type || "application/octet-stream";

      const isImage = mediaType.startsWith("image/");

      setAttachment({
        type: isImage ? "image" : "file",
        name: file.name,
        base64,
        mediaType,
        preview: isImage ? result : undefined,
      });
    };
    reader.readAsDataURL(file);

    // Reset file input so same file can be selected again
    e.target.value = "";
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !attachment) || loading) return;
    if (text.length > 10000) {
      alert(t("messageTooLong"));
      return;
    }

    const displayContent = attachment
      ? `${attachment.type === "image" ? "📷" : "📎"} ${attachment.name}${text ? `\n${text}` : ""}`
      : text;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: displayContent,
      timestamp: Date.now(),
      agentId: agent.id,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const currentAttachment = attachment;
    setAttachment(null);
    setLoading(true);
    // Haptic feedback
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); } catch {}

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData || "";

      const body: Record<string, unknown> = {
        agentId: agent.id,
        message: text || "What's in this image?",
        languageHint: getLanguageDirective(),
        newConversation: isNewChat,
        telegramId: tg?.initDataUnsafe?.user?.id,
        firstName: tg?.initDataUnsafe?.user?.first_name,
        lastName: tg?.initDataUnsafe?.user?.last_name,
        username: tg?.initDataUnsafe?.user?.username,
      };
      if (isNewChat) setIsNewChat(false);

      if (currentAttachment) {
        body.attachment = {
          type: currentAttachment.type,
          name: currentAttachment.name,
          base64: currentAttachment.base64,
          mediaType: currentAttachment.mediaType,
        };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify(body),
      });

      // Handle error responses
      if (!res.ok) {
        let errorContent = t("somethingWrong");
        try {
          const errData = await res.json();
          if (res.status === 403) {
            errorContent = `⭐ ${agent.name} ${t("premiumAgent")}`;
          } else if (res.status === 429) {
            errorContent = `${t("dailyLimit")} ${errData.limit} ${t("upgradeForUnlimited")}`;
          }
        } catch {}
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorContent,
          timestamp: Date.now(),
          agentId: agent.id,
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        return;
      }

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
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: t("somethingWrong"),
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
        <button
          onClick={() => {
            setMessages([]);
            setIsNewChat(true);
          }}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ background: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-hint-color)" }}
        >
          {t("newChat")}
        </button>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">{agent.icon}</div>
            <div className="font-semibold mb-1">{agent.name}</div>
            <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
              {agent.description}
            </p>
            <p className="text-xs mt-3 mb-4" style={{ color: "var(--tg-theme-hint-color)" }}>
              {t("sendOrAttach")}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {(QUICK_PROMPTS[agent.id] || QUICK_PROMPTS.default).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full text-xs transition-transform active:scale-95"
                  style={{ background: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-hint-color)" }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}
               className={`flex message-appear ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
              {msg.content ? (
                msg.role === "assistant"
                  ? <Markdown content={msg.content} />
                  : <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                loading ? (
                  <span className="typing-dots">
                    <span>●</span><span>●</span><span>●</span>
                  </span>
                ) : null
              )}
              {msg.content && (
                <div className="flex items-center justify-end gap-2 mt-1">
                  {msg.role === "assistant" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(msg.content);
                        const btn = e.currentTarget;
                        btn.textContent = "✓";
                        setTimeout(() => { btn.textContent = "Copy"; }, 1500);
                      }}
                      className="px-1.5 py-0.5 rounded"
                      style={{ fontSize: "0.6rem", opacity: 0.4, background: "rgba(0,0,0,0.2)" }}
                    >
                      Copy
                    </button>
                  )}
                  <span style={{ fontSize: "0.6rem", opacity: 0.5 }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {showScrollBtn && (
          <button
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="fixed bottom-24 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg z-10"
            style={{ background: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
          >
            ↓
          </button>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 py-2 border-t flex items-center gap-3"
             style={{ borderColor: "var(--tg-theme-secondary-bg-color)", background: "var(--tg-theme-bg-color)" }}>
          {attachment.preview ? (
            <img src={attachment.preview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg"
                 style={{ background: "var(--tg-theme-secondary-bg-color)" }}>
              📎
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{attachment.name}</div>
            <div className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
              {attachment.type === "image" ? t("imageAttached") : t("fileAttached")}
            </div>
          </div>
          <button onClick={removeAttachment} className="text-lg p-1 opacity-60">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t"
           style={{ borderColor: "var(--tg-theme-secondary-bg-color)", background: "var(--tg-theme-bg-color)" }}>
        <div className="flex gap-2 items-center">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="rounded-full w-10 h-10 flex items-center justify-center text-lg transition-opacity disabled:opacity-30 flex-shrink-0"
            style={{ background: "var(--tg-theme-secondary-bg-color)" }}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={attachment ? t("addCaption") : t("typeMessage")}
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--tg-theme-secondary-bg-color)",
              color: "var(--tg-theme-text-color)",
            }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && !attachment) || loading}
            className="rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold transition-opacity disabled:opacity-30 flex-shrink-0"
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
