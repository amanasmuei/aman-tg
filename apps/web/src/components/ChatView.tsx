import { useState, useRef, useEffect } from "react";
import type { Agent, ChatMessage } from "@aman-tg/shared";

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
}

export function ChatView({ agent, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    fetch(`/api/conversations/${agent.id}?telegramId=${telegramId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [agent.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<mediaType>;base64,<data>"
      const base64 = result.split(",")[1];
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

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData || "";

      const body: Record<string, unknown> = {
        agentId: agent.id,
        message: text || "What's in this image?",
        telegramId: tg?.initDataUnsafe?.user?.id,
        firstName: tg?.initDataUnsafe?.user?.first_name,
        lastName: tg?.initDataUnsafe?.user?.last_name,
        username: tg?.initDataUnsafe?.user?.username,
      };

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
        let errorContent = "Sorry, something went wrong. Please try again.";
        try {
          const errData = await res.json();
          if (res.status === 403) {
            errorContent = `⭐ ${agent.name} is a Premium agent.\n\nUpgrade to Pro to unlock unlimited messages and all premium agents!\n\nUse /pro in the bot chat to upgrade.`;
          } else if (res.status === 429) {
            errorContent = `You've reached your daily limit of ${errData.limit} messages.\n\nUpgrade to Pro for unlimited access!\n\nUse /pro in the bot chat to upgrade.`;
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
        <button
          onClick={() => {
            setMessages([]);
            // Create a new conversation by clearing state — API will create new one on next message
          }}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ background: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-hint-color)" }}
        >
          + New
        </button>
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
              Send a message or attach an image to start
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}
               className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
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
              {attachment.type === "image" ? "Image" : "File"} attached
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
            placeholder={attachment ? "Add a caption..." : "Type a message..."}
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
