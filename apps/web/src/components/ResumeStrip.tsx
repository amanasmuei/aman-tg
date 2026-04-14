import { useEffect, useState } from "react";
import { AGENTS } from "@aman-tg/shared";
import { t } from "../lib/i18n";
import { useTelegramId } from "../lib/useTelegramId";

interface ConversationItem {
  id: string;
  agent_id: string;
  title: string;
  updated_at: number;
}

interface Props {
  onSelect: (agentId: string, conversationId: string) => void;
}

export function ResumeStrip({ onSelect }: Props) {
  const telegramId = useTelegramId();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!telegramId) {
      setLoaded(true);
      return;
    }
    const ac = new AbortController();
    fetch(`/api/conversations?telegramId=${telegramId}&limit=5`, {
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((data) => setItems(data.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => ac.abort();
  }, [telegramId]);

  if (!loaded || items.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="px-4 mb-2">
        <span
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: "var(--tg-theme-hint-color)" }}
        >
          {t("resumeStripLabel")}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        {items.slice(0, 5).map((conv) => {
          const agent = AGENTS.find((a) => a.id === conv.agent_id);
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.agent_id, conv.id)}
              className="flex-shrink-0 w-[180px] text-left rounded-2xl p-3 transition-transform active:scale-[0.98]"
              style={{ background: "var(--tg-theme-secondary-bg-color)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{agent?.icon || "💬"}</span>
                <span className="text-xs font-semibold truncate">
                  {agent?.name || conv.agent_id}
                </span>
              </div>
              <p
                className="text-[11px] leading-snug line-clamp-2"
                style={{ color: "var(--tg-theme-hint-color)" }}
              >
                {conv.title || t("newConversation")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
