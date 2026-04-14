export type StartParam =
  | { kind: "agent"; id: string }
  | { kind: "kedai"; id: string }
  | { kind: "ref" };

/**
 * Parse Telegram's `startapp` parameter into a routing intent.
 * Known shapes: `agent_<id>`, `kedai_<merchantId>`, `ref_<telegramId>`.
 * Returns null for empty/unknown input.
 *
 * Referrals are captured so the Mini App can recognise them and intentionally
 * no-op; API-side attribution handles them separately.
 */
export function parseStartParam(raw: string | undefined | null): StartParam | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  const agent = /^agent_(.+)$/.exec(s);
  if (agent) return { kind: "agent", id: agent[1] };

  const kedai = /^kedai_(.+)$/.exec(s);
  if (kedai) return { kind: "kedai", id: kedai[1] };

  if (/^ref_.+$/.test(s)) return { kind: "ref" };

  return null;
}
