import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent, ChatMessage } from "@aman-tg/shared";
import { Markdown } from "./Markdown";
import { t, getLanguageDirective } from "../lib/i18n";
import { getAgentIcon, getAccent, Paperclip, ArrowUp, ArrowDown, Check, Copy } from "../lib/icons";
import { tap } from "../lib/haptics";
import { useTelegramBackButton } from "../lib/useTelegramBackButton";

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
  todo: ["Show my tasks", "Add a new task", "What should I do today?"],
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
  initialMerchantId?: string;
  initialMerchantName?: string;
}

export function ChatView({ agent, onBack, conversationId, initialMerchantId, initialMerchantName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const merchantAutoSentRef = useRef(false);

  // Tap-to-toggle task state — keyed by short task id (first 8 chars).
  // Survives the chat session; on remount, falls back to whatever the
  // assistant message text says.
  const [taskOverrides, setTaskOverrides] = useState<Record<string, boolean>>({});

  const handleTaskToggle = useCallback(
    async (taskId: string, done: boolean) => {
      const tg = window.Telegram?.WebApp;
      const telegramId = tg?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const previous = taskOverrides[taskId];
      // Optimistic flip
      setTaskOverrides((m) => ({ ...m, [taskId]: done }));
      try {
        const res = await fetch(`/api/tasks/${taskId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId, status: done ? "done" : "pending" }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        // Light haptic on success
        tg?.HapticFeedback?.notificationOccurred?.("success");
      } catch (err) {
        console.error("[TASK_TOGGLE] failed", err);
        // Roll back
        setTaskOverrides((m) => {
          const next = { ...m };
          if (previous === undefined) delete next[taskId];
          else next[taskId] = previous;
          return next;
        });
        tg?.HapticFeedback?.notificationOccurred?.("error");
      }
    },
    [taskOverrides],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Coarse pointer = touch device (phone/tablet). On these, Enter must insert
  // a newline so the OS keyboard shows a proper return key — send is via button.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Auto-grow the textarea with the content, capped so it never eats the chat.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 140; // ~5 lines at 14px
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [input]);

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
  }, [agent.id, conversationId]);

  // Auto-send initial merchant context message if coming from Kedai tab
  useEffect(() => {
    if (!initialMerchantId || !initialMerchantName) return;
    if (merchantAutoSentRef.current) return;
    // Wait until history load has a chance to run (messages may still be empty)
    // We fire after a short tick so the history effect runs first
    const timer = setTimeout(() => {
      if (merchantAutoSentRef.current) return;
      // Only auto-send if no messages loaded (fresh conversation)
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        merchantAutoSentRef.current = true;
        const autoText = `Saya nak tengok menu ${initialMerchantName}`;
        setInput(autoText);
        // Use a micro-task to trigger send after state settles
        setTimeout(() => {
          setInput("");
          const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: autoText,
            timestamp: Date.now(),
            agentId: agent.id,
          };
          setMessages((m) => [...m, userMsg]);
          setLoading(true);

          const tg = window.Telegram?.WebApp;
          const initData = tg?.initData || "";
          const body = {
            agentId: agent.id,
            message: autoText,
            languageHint: "ms",
            newConversation: true,
            telegramId: tg?.initDataUnsafe?.user?.id,
            firstName: tg?.initDataUnsafe?.user?.first_name,
            lastName: tg?.initDataUnsafe?.user?.last_name,
            username: tg?.initDataUnsafe?.user?.username,
          };

          fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-telegram-init-data": initData,
            },
            body: JSON.stringify(body),
          })
            .then(async (res) => {
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
              setMessages((m) => [...m, assistantMsg]);
              if (reader) {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  assistantText += decoder.decode(value, { stream: true });
                  setMessages((m) =>
                    m.map((msg) =>
                      msg.id === assistantMsg.id ? { ...msg, content: assistantText } : msg
                    )
                  );
                }
              }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        }, 0);
        return prev;
      });
    }, 300);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMerchantId, initialMerchantName]);

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
            errorContent = errData.error?.includes("Image")
              ? `📷 ${errData.error}. ${errData.hint || ""}`
              : `⭐ ${agent.name} ${t("premiumAgent")}`;
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
    } catch (err) {
      const isNetwork = err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("network"));
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: isNetwork
          ? "Unable to connect. Please check your internet and try again."
          : t("somethingWrong"),
        timestamp: Date.now(),
        agentId: agent.id,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const AgentIcon = getAgentIcon(agent.id);
  const accent = getAccent(agent.category);
  const canSend = (input.trim() || attachment) && !loading;

  useTelegramBackButton(onBack);

  return (
    <div
      className="flex flex-col h-screen stack-push"
      style={{ background: "var(--ink-0)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <button
          onClick={() => {
            tap("light");
            onBack();
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: "var(--ink-2)",
            border: "1px solid var(--rule)",
            color: "var(--paper)",
          }}
          aria-label="Back"
        >
          ←
        </button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: accent.bg,
            boxShadow: `0 4px 16px -8px ${accent.fg}`,
          }}
        >
          <AgentIcon size={16} strokeWidth={2} style={{ color: accent.fg }} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="display truncate"
            style={{
              color: "var(--paper)",
              fontSize: "15px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {agent.name}
          </div>
          <div
            className="mono text-[10px] truncate"
            style={{ color: "var(--paper-3)", letterSpacing: "0.02em" }}
          >
            @{agent.id}
          </div>
        </div>
        <button
          onClick={() => {
            tap("light");
            setMessages([]);
            setIsNewChat(true);
          }}
          className="mono text-[10px] px-3 py-1.5 rounded-full transition-transform active:scale-95"
          style={{
            background: "var(--ink-2)",
            color: "var(--paper-2)",
            border: "1px solid var(--rule)",
            letterSpacing: "0.06em",
          }}
        >
          {t("newChat")}
        </button>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative"
      >
        {messages.length === 0 && (
          <div className="text-center py-10 px-4 fade-in">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: accent.bg,
                boxShadow: `0 12px 32px -14px ${accent.fg}`,
              }}
            >
              <AgentIcon size={26} strokeWidth={2} style={{ color: accent.fg }} />
            </div>
            <div
              className="display mb-1"
              style={{
                color: "var(--paper)",
                fontSize: "22px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {agent.name}
            </div>
            <p
              className="text-sm leading-relaxed max-w-xs mx-auto"
              style={{ color: "var(--paper-2)" }}
            >
              {agent.description}
            </p>
            <p
              className="mono text-[10px] mt-4 mb-4"
              style={{ color: "var(--paper-3)", letterSpacing: "0.08em" }}
            >
              {t("sendOrAttach")}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {(QUICK_PROMPTS[agent.id] || QUICK_PROMPTS.default).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    tap("light");
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-full text-xs transition-transform active:scale-95"
                  style={{
                    background: "var(--ink-2)",
                    color: "var(--paper-2)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex message-appear ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={{
                  background: isUser ? "var(--terra)" : "var(--ink-2)",
                  color: isUser ? "var(--ink-0)" : "var(--paper)",
                  border: isUser ? "none" : "1px solid var(--rule)",
                  borderBottomRightRadius: isUser ? "6px" : undefined,
                  borderBottomLeftRadius: !isUser ? "6px" : undefined,
                  boxShadow: isUser
                    ? "0 6px 18px -10px rgba(199,122,82,0.5)"
                    : "none",
                }}
              >
                {msg.content ? (
                  isUser ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <Markdown
                      content={msg.content}
                      onTaskToggle={handleTaskToggle}
                      taskOverrides={taskOverrides}
                    />
                  )
                ) : loading ? (
                  <span className="typing-dots inline-flex gap-0.5">
                    <span style={{ color: "var(--paper-2)" }}>●</span>
                    <span style={{ color: "var(--paper-2)" }}>●</span>
                    <span style={{ color: "var(--paper-2)" }}>●</span>
                  </span>
                ) : null}
                {msg.content && (
                  <div className="flex items-center justify-end gap-2 mt-1.5">
                    {!isUser && (
                      <CopyButton text={msg.content} />
                    )}
                    <span
                      className="mono text-[9px]"
                      style={{
                        color: isUser
                          ? "rgba(13,11,8,0.55)"
                          : "var(--paper-3)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {showScrollBtn && (
          <button
            onClick={() => {
              tap("light");
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="fixed bottom-24 right-4 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-transform active:scale-95"
            style={{
              background: "var(--ink-2)",
              color: "var(--paper)",
              border: "1px solid var(--rule-2)",
              boxShadow: "0 8px 20px -6px rgba(0,0,0,0.6)",
            }}
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={16} strokeWidth={2.2} />
          </button>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div
          className="px-4 py-2.5 flex items-center gap-3"
          style={{
            borderTop: "1px solid var(--rule)",
            background: "var(--ink-1)",
          }}
        >
          {attachment.preview ? (
            <img
              src={attachment.preview}
              alt="Preview"
              className="w-12 h-12 rounded-lg object-cover"
              style={{ border: "1px solid var(--rule-2)" }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: "var(--ink-2)" }}
            >
              <Paperclip size={18} style={{ color: "var(--paper-2)" }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-medium truncate"
              style={{ color: "var(--paper)" }}
            >
              {attachment.name}
            </div>
            <div
              className="mono text-[10px]"
              style={{ color: "var(--paper-3)", letterSpacing: "0.04em" }}
            >
              {attachment.type === "image"
                ? t("imageAttached")
                : t("fileAttached")}
            </div>
          </div>
          <button
            onClick={removeAttachment}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{
              background: "var(--ink-3)",
              color: "var(--paper-2)",
            }}
            aria-label="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div
        className="px-3 py-3"
        style={{
          borderTop: "1px solid var(--rule)",
          background: "var(--ink-0)",
        }}
      >
        <div className="flex gap-2 items-end">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="rounded-full w-10 h-10 flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0 active:scale-95"
            style={{
              background: "var(--ink-2)",
              color: "var(--paper-2)",
              border: "1px solid var(--rule)",
            }}
            aria-label="Attach file"
          >
            <Paperclip size={18} strokeWidth={2} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              if (isTouch) return;
              if (e.shiftKey) return;
              e.preventDefault();
              sendMessage();
            }}
            placeholder={attachment ? t("addCaption") : t("typeMessage")}
            className="flex-1 rounded-3xl px-4 py-2.5 text-sm outline-none resize-none leading-5"
            style={{
              background: "var(--ink-2)",
              color: "var(--paper)",
              border: "1px solid var(--rule)",
              maxHeight: "140px",
              caretColor: "var(--terra)",
            }}
            disabled={loading}
          />
          <button
            onClick={() => {
              tap("medium");
              sendMessage();
            }}
            disabled={!canSend}
            className="rounded-full w-10 h-10 flex items-center justify-center font-bold transition-all flex-shrink-0 active:scale-95"
            style={{
              background: canSend ? "var(--terra)" : "var(--ink-2)",
              color: canSend ? "var(--ink-0)" : "var(--paper-3)",
              border: canSend
                ? "none"
                : "1px solid var(--rule)",
              boxShadow: canSend
                ? "0 8px 20px -8px rgba(199,122,82,0.6)"
                : "none",
            }}
            aria-label="Send"
          >
            <ArrowUp size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny copy-to-clipboard button for assistant messages. Lives in its own
 * component so the tick-then-reset effect doesn't need a ref-per-message.
 */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="mono text-[9px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 transition-colors"
      style={{
        color: "var(--paper-3)",
        letterSpacing: "0.06em",
      }}
      aria-label="Copy message"
    >
      {done ? (
        <>
          <Check size={10} strokeWidth={2.6} />
          <span>COPIED</span>
        </>
      ) : (
        <>
          <Copy size={10} strokeWidth={2} />
          <span>COPY</span>
        </>
      )}
    </button>
  );
}
