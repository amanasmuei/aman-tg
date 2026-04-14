import { useEffect, useState } from "react";
import { AGENTS } from "@aman-tg/shared";
import { getAgentIcon, getAccent } from "../lib/icons";
import { t } from "../lib/i18n";
import { useTelegramId } from "../lib/useTelegramId";
import { tap } from "../lib/haptics";

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
    <div className="mb-4">
      <div className="px-4 mb-2 flex items-center gap-2">
        <span aria-hidden style={{ color: "var(--sun)" }}>◆</span>
        <span className="kicker-night">{t("resumeStripLabel")}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
        {items.slice(0, 5).map((conv) => {
          const agent = AGENTS.find((a) => a.id === conv.agent_id);
          const Icon = getAgentIcon(conv.agent_id);
          const accent = agent ? getAccent(agent.category) : null;
          return (
            <button
              key={conv.id}
              onClick={() => {
                tap("light");
                onSelect(conv.agent_id, conv.id);
              }}
              className="flex-shrink-0 w-[186px] text-left rounded-2xl p-3 transition-transform active:scale-[0.98] card-night"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: accent?.bg ?? "var(--ink-3)",
                  }}
                >
                  <Icon
                    size={14}
                    strokeWidth={2}
                    style={{ color: accent?.fg ?? "var(--paper-2)" }}
                  />
                </div>
                <span
                  className="display text-[14px] truncate"
                  style={{
                    color: "var(--paper)",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {agent?.name || conv.agent_id}
                </span>
              </div>
              <p
                className="display text-[12px] leading-snug line-clamp-2"
                style={{
                  color: "var(--paper-2)",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
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
