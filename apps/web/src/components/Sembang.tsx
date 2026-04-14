import { useEffect, useState } from "react";
import { AGENTS } from "@aman-tg/shared";
import { t } from "../lib/i18n";
import { useTelegramId } from "../lib/useTelegramId";
import { groupConversationsByTime } from "../lib/timeGrouping";
import { MessageCircle, getAgentIcon, getAccent } from "../lib/icons";
import { tap } from "../lib/haptics";

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
        <div className="kicker-night mb-2 px-1">{label}</div>
        <div className="space-y-2">
          {list.map((conv) => {
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
                className="w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-transform active:scale-[0.98] card-night"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: accent?.bg ?? "var(--ink-3)" }}
                >
                  <Icon
                    size={18}
                    strokeWidth={2}
                    style={{ color: accent?.fg ?? "var(--paper-2)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="display truncate"
                      style={{
                        color: "var(--paper)",
                        fontSize: "15px",
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {agent?.name || conv.agent_id}
                    </span>
                    <span
                      className="mono text-[10px] flex-shrink-0 ml-auto"
                      style={{
                        color: "var(--paper-3)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {timeAgo(conv.updated_at)}
                    </span>
                  </div>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--paper-2)" }}
                  >
                    {conv.title || t("newConversation")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-6 pb-4" style={{ background: "var(--ink-0)" }}>
        <h1
          className="display"
          style={{
            color: "var(--paper)",
            fontSize: "32px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {t("sembangTitle")}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{ background: "var(--ink-2)" }}
              />
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-16 px-6 fade-in">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--ink-2)" }}
            >
              <MessageCircle
                size={22}
                strokeWidth={1.6}
                style={{ color: "var(--paper-3)" }}
              />
            </div>
            <p
              className="display text-[20px] mb-1.5"
              style={{ color: "var(--paper)", letterSpacing: "-0.01em" }}
            >
              {t("sembangEmptyTitle")}
            </p>
            <p
              className="text-sm mb-6 leading-relaxed"
              style={{ color: "var(--paper-2)" }}
            >
              {t("sembangEmptyHint")}
            </p>
            <button onClick={onGoToTeman} className="btn-terra text-sm">
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
