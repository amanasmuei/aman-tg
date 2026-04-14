import { useEffect, useState } from "react";
import { AGENTS } from "@aman-tg/shared";
import { t } from "../lib/i18n";
import { useTelegramId } from "../lib/useTelegramId";
import { groupConversationsByTime } from "../lib/timeGrouping";
import { MessageCircle } from "../lib/icons";

interface ConversationItem {
  id: string;
  agent_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

interface Props {
  onSelect: (agentId: string, conversationId: string) => void;
  onGoToTeman: () => void;
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return t("justNow");
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString();
}

export function Sembang({ onSelect, onGoToTeman }: Props) {
  const telegramId = useTelegramId();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!telegramId) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    fetch(`/api/conversations?telegramId=${telegramId}`, {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data) => setItems(data.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [telegramId]);

  const grouped = groupConversationsByTime(items);

  const renderGroup = (label: string, list: ConversationItem[]) => {
    if (list.length === 0) return null;
    return (
      <div key={label} className="mb-5">
        <div
          className="text-[11px] font-semibold tracking-wider uppercase mb-2 px-1"
          style={{ color: "var(--tg-theme-hint-color)" }}
        >
          {label}
        </div>
        <div className="space-y-2">
          {list.map((conv) => {
            const agent = AGENTS.find((a) => a.id === conv.agent_id);
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.agent_id, conv.id)}
                className="w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-transform active:scale-[0.98]"
                style={{ background: "var(--tg-theme-secondary-bg-color)" }}
              >
                <span className="text-xl flex-shrink-0">
                  {agent?.icon || "💬"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {agent?.name || conv.agent_id}
                    </span>
                    <span
                      className="text-[11px] flex-shrink-0"
                      style={{ color: "var(--tg-theme-hint-color)" }}
                    >
                      {timeAgo(conv.updated_at)}
                    </span>
                  </div>
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: "var(--tg-theme-hint-color)" }}
                  >
                    {conv.title || t("newConversation")}
                  </p>
                </div>
                <span style={{ color: "var(--tg-theme-hint-color)" }}>›</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <div
        className="px-4 pt-5 pb-3"
        style={{ background: "var(--tg-theme-bg-color)" }}
      >
        <h1 className="text-2xl font-bold">{t("sembangTitle")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{ background: "var(--tg-theme-secondary-bg-color)" }}
              />
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-16 px-6 fade-in">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--tg-theme-secondary-bg-color)" }}
            >
              <MessageCircle
                size={24}
                strokeWidth={1.8}
                style={{ color: "var(--tg-theme-hint-color)" }}
              />
            </div>
            <p className="text-base font-semibold mb-1">
              {t("sembangEmptyTitle")}
            </p>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--tg-theme-hint-color)" }}
            >
              {t("sembangEmptyHint")}
            </p>
            <button
              onClick={onGoToTeman}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-transform active:scale-95"
              style={{
                background: "var(--tg-theme-button-color)",
                color: "var(--tg-theme-button-text-color)",
              }}
            >
              {t("sembangEmptyCta")}
            </button>
          </div>
        )}
        {!loading && items.length > 0 && (
          <>
            {renderGroup(t("sembangToday"), grouped.today)}
            {renderGroup(t("sembangYesterday"), grouped.yesterday)}
            {renderGroup(t("sembangThisWeek"), grouped.thisWeek)}
            {renderGroup(t("sembangOlder"), grouped.older)}
          </>
        )}
      </div>
    </div>
  );
}
