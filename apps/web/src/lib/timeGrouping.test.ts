import { describe, it, expect } from "vitest";
import { groupConversationsByTime } from "./timeGrouping";

const DAY = 24 * 60 * 60 * 1000;
// Use a fixed reference time anchored to local-midnight to avoid DST / TZ edge drift
const now = new Date(2026, 3, 14, 10, 0, 0).getTime(); // 2026-04-14 10:00 local

describe("groupConversationsByTime", () => {
  it("puts same-day items in today", () => {
    const items = [{ id: "a", updated_at: now - 2 * 60 * 60 * 1000 }];
    const out = groupConversationsByTime(items, now);
    expect(out.today).toHaveLength(1);
    expect(out.yesterday).toHaveLength(0);
  });

  it("puts previous calendar day in yesterday", () => {
    const items = [{ id: "b", updated_at: now - DAY - 60 * 60 * 1000 }];
    const out = groupConversationsByTime(items, now);
    expect(out.today).toHaveLength(0);
    expect(out.yesterday).toHaveLength(1);
  });

  it("puts items 2..6 days old in thisWeek", () => {
    const items = [{ id: "c", updated_at: now - 3 * DAY }];
    const out = groupConversationsByTime(items, now);
    expect(out.thisWeek).toHaveLength(1);
  });

  it("puts items >= 7 days old in older", () => {
    const items = [{ id: "d", updated_at: now - 8 * DAY }];
    const out = groupConversationsByTime(items, now);
    expect(out.older).toHaveLength(1);
  });

  it("sorts each bucket by updated_at descending", () => {
    const items = [
      { id: "a", updated_at: now - 1 * 60 * 60 * 1000 },
      { id: "b", updated_at: now - 3 * 60 * 60 * 1000 },
      { id: "c", updated_at: now - 2 * 60 * 60 * 1000 },
    ];
    const out = groupConversationsByTime(items, now);
    expect(out.today.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });
});
