import { useState, useEffect } from "react";
import { AGENTS } from "@aman-tg/shared";

interface ConversationItem {
  id: string;
  agent_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

interface Props {
  onSelect: (agentId: string, conversationId: string) => void;
  onBack: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ConversationList({ onSelect, onBack }: Props) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) { setLoading(false); return; }

    fetch(`/api/conversations?telegramId=${telegramId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations) {
          setConversations(data.conversations);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-4 py-3 border-b"
           style={{ borderColor: "var(--tg-theme-secondary-bg-color)", background: "var(--tg-theme-bg-color)" }}>
        <button onClick={onBack} className="text-lg p-1">←</button>
        <div className="font-semibold text-sm">Conversations</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl p-4 animate-pulse"
                   style={{ background: "var(--tg-theme-secondary-bg-color)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full" style={{ background: "var(--tg-theme-bg-color)" }} />
                  <div className="flex-1">
                    <div className="h-3 rounded w-24 mb-2" style={{ background: "var(--tg-theme-bg-color)" }} />
                    <div className="h-2 rounded w-40" style={{ background: "var(--tg-theme-bg-color)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">💬</div>
            <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
              No conversations yet. Start chatting with an agent!
            </p>
          </div>
        )}

        <div className="space-y-2">
          {conversations.map((conv) => {
            const agent = AGENTS.find((a) => a.id === conv.agent_id);
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.agent_id, conv.id)}
                className="w-full text-left rounded-xl p-4 transition-transform active:scale-98"
                style={{ background: "var(--tg-theme-secondary-bg-color)", borderBottom: "1px solid var(--tg-theme-bg-color)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">{agent?.icon || "💬"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{agent?.name || conv.agent_id}</span>
                      <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
                        {timeAgo(conv.updated_at)}
                      </span>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--tg-theme-hint-color)" }}>
                      {conv.title || "New conversation"}
                    </p>
                  </div>
                  <span className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>›</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
