export interface TimedItem {
  updated_at: number;
}

export interface Grouped<T extends TimedItem> {
  today: T[];
  yesterday: T[];
  thisWeek: T[];
  older: T[];
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Bucket items into today / yesterday / this week / older buckets.
 * Bucket boundaries use local-time midnight so "today" matches human intuition.
 * Each bucket is sorted newest-first.
 */
export function groupConversationsByTime<T extends TimedItem>(
  items: T[],
  now: number = Date.now(),
): Grouped<T> {
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  // "This week" = anything in the last 7 local days (inclusive of today),
  // so the window starts 6 midnights before today.
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const g: Grouped<T> = { today: [], yesterday: [], thisWeek: [], older: [] };
  for (const item of items) {
    const u = item.updated_at;
    if (u >= todayStart) g.today.push(item);
    else if (u >= yesterdayStart) g.yesterday.push(item);
    else if (u >= weekStart) g.thisWeek.push(item);
    else g.older.push(item);
  }
  const desc = (a: T, b: T) => b.updated_at - a.updated_at;
  g.today.sort(desc);
  g.yesterday.sort(desc);
  g.thisWeek.sort(desc);
  g.older.sort(desc);
  return g;
}
