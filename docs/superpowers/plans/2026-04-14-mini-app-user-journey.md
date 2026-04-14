# Mini App User Journey Revamp — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the Kedai top-tab into Jiran's AgentDetail, add a `Teman` + `Sembang` bottom nav, promote conversation history from a floating chip to a first-class surface, and wire a unified search — without changing any API, agent prompt, or the Landing page.

**Architecture:** Incremental refactor of `apps/web`. Each task leaves the Mini App buildable and usable; the Kedai directory stays reachable at every step (via the old tab until task 6, then via Jiran). New components are small and single-purpose (`BottomNav`, `ResumeStrip`, `CategoryChips`, `JiranMerchantSection`, `HeaderMenu`). Pure helper logic (time grouping, merchant-search filter) lives in small testable modules under `apps/web/src/lib/`.

**Tech Stack:** React 19, TypeScript 5, Tailwind v4, Vite 6, `@telegram-apps/sdk-react`. Existing components use Telegram theme CSS variables (`--tg-theme-*`) and follow the dark GitHub palette set in `index.css`. No new runtime deps.

**Spec:** `docs/superpowers/specs/2026-04-14-mini-app-user-journey-design.md` (§1–§14).

**Testing approach:** There is no test harness in `apps/web` today. This plan adds **Vitest** only where pure logic benefits (time grouping and merchant-search filter). Everything else is verified via `pnpm typecheck`, `pnpm build`, and manual browser checks against a checklist. Adding a wider test suite is out of scope.

**Commit style:** the repo uses Conventional Commits with a scope, e.g. `feat(web): …`, `refactor(web): …`. Do not add a `Co-Authored-By` trailer.

---

## Task 0 — Prep: create a working branch and wire Vitest

**Files:**
- Modify: `apps/web/package.json` — add vitest devDep + `test` script
- Create: `apps/web/vitest.config.ts`

- [ ] **Step 1: Create a branch**

```bash
git checkout -b feat/mini-app-user-journey
```

- [ ] **Step 2: Add vitest dev dependency and a `test` script**

Edit `apps/web/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Install**

Run: `pnpm install`
Expected: installs vitest only in `apps/web`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts ../../pnpm-lock.yaml
git commit -m "chore(web): add vitest for pure-logic tests"
```

---

## Task 1 — i18n: add new keys, drop dead ones

**Files:**
- Modify: `apps/web/src/lib/i18n.ts`

**Why:** new surfaces need their strings before anything renders them. Do it first so every later task just calls `t()`.

- [ ] **Step 1: Add new keys (en/ms/id) in `i18n.ts`**

Add to each of the `en`, `ms`, `id` blocks:

**English (append inside `en`):**

```ts
// Bottom nav
navTeman: "Companions",
navSembang: "Chats",

// Teman home (new)
searchUnifiedPlaceholder: "Search a companion, shop, or dish",
resumeStripLabel: "Pick up where you left off",
categoryServices: "Services",

// Sembang (upgraded history)
sembangTitle: "Chats",
sembangToday: "Today",
sembangYesterday: "Yesterday",
sembangThisWeek: "This week",
sembangOlder: "Older",
sembangEmptyTitle: "No chats yet",
sembangEmptyHint: "Pick a companion to start your first chat.",
sembangEmptyCta: "Go to companions",

// Jiran merchant panel
jiranKedaiHeading: "Shops nearby",
jiranKedaiCount: "{{n}} shops",
jiranKedaiEmpty: "No shops online right now.",

// AgentDetail
agentExampleTryPrefix: "Try: ",

// Agent card pill
agentCardJiranPill: "{{n}} shops",

// Search results grouping
searchResultsCompanions: "Companions",
searchResultsShops: "Shops (via Jiran)",
```

**Bahasa Melayu (inside `ms`):**

```ts
navTeman: "Teman",
navSembang: "Sembang",
searchUnifiedPlaceholder: "Cari teman, kedai, atau makanan",
resumeStripLabel: "Sambung di tempat anda berhenti",
categoryServices: "Servis",
sembangTitle: "Sembang",
sembangToday: "Hari ini",
sembangYesterday: "Semalam",
sembangThisWeek: "Minggu ini",
sembangOlder: "Lebih lama",
sembangEmptyTitle: "Belum ada perbualan",
sembangEmptyHint: "Pilih teman untuk mula perbualan pertama anda.",
sembangEmptyCta: "Ke senarai teman",
jiranKedaiHeading: "Kedai berhampiran",
jiranKedaiCount: "{{n}} kedai",
jiranKedaiEmpty: "Belum ada kedai online sekarang.",
agentExampleTryPrefix: "Cuba: ",
agentCardJiranPill: "{{n}} kedai",
searchResultsCompanions: "Teman",
searchResultsShops: "Kedai (via Jiran)",
```

**Bahasa Indonesia (inside `id`):**

```ts
navTeman: "Teman",
navSembang: "Obrolan",
searchUnifiedPlaceholder: "Cari teman, toko, atau makanan",
resumeStripLabel: "Lanjutkan dari yang terakhir",
categoryServices: "Servis",
sembangTitle: "Obrolan",
sembangToday: "Hari ini",
sembangYesterday: "Kemarin",
sembangThisWeek: "Minggu ini",
sembangOlder: "Lebih lama",
sembangEmptyTitle: "Belum ada obrolan",
sembangEmptyHint: "Pilih teman untuk memulai obrolan pertamamu.",
sembangEmptyCta: "Lihat teman",
jiranKedaiHeading: "Toko di dekatmu",
jiranKedaiCount: "{{n}} toko",
jiranKedaiEmpty: "Belum ada toko online saat ini.",
agentExampleTryPrefix: "Coba: ",
agentCardJiranPill: "{{n}} toko",
searchResultsCompanions: "Teman",
searchResultsShops: "Toko (via Jiran)",
```

- [ ] **Step 2: Extend `t()` to support `{{n}}` interpolation**

In `i18n.ts`, update `t()`:

```ts
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = strings[currentLocale]?.[key] || strings.en[key] || key;
  if (!params) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ""));
}
```

- [ ] **Step 3: Leave the old keys in place for now**

Don't delete `kedai`, `pakar`, `searchKedaiPlaceholder`, `searchPakarPlaceholder`, `tryPakar`, `continueConversation` yet — existing components still use them. Task 10 removes unused ones after cleanup.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @aman-tg/web typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/i18n.ts
git commit -m "feat(web): i18n keys for new nav, sembang, jiran panel; {{n}} interpolation in t()"
```

---

## Task 2 — Helper: `useTelegramId` hook + `haptics` util

**Files:**
- Create: `apps/web/src/lib/useTelegramId.ts`
- Create: `apps/web/src/lib/haptics.ts`
- Modify (later, in context): callers still use the inline pattern until they're touched for other reasons — this task only adds the helpers.

**Why:** six+ files duplicate `window.Telegram?.WebApp?.initDataUnsafe?.user?.id`. A small hook keeps new code clean.

- [ ] **Step 1: Write `useTelegramId`**

```ts
// apps/web/src/lib/useTelegramId.ts
import { useEffect, useState } from "react";

export function useTelegramId(): number | null {
  const [id, setId] = useState<number | null>(null);
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (typeof userId === "number") setId(userId);
  }, []);
  return id;
}
```

- [ ] **Step 2: Write `haptics`**

```ts
// apps/web/src/lib/haptics.ts
type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

export function tap(style: ImpactStyle = "light") {
  const hf = window.Telegram?.WebApp?.HapticFeedback;
  if (!hf) return;
  try { hf.impactOccurred(style); } catch {}
}

export function selectionChange() {
  const hf = window.Telegram?.WebApp?.HapticFeedback;
  if (!hf) return;
  try { hf.selectionChanged(); } catch {}
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @aman-tg/web typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/useTelegramId.ts apps/web/src/lib/haptics.ts
git commit -m "feat(web): add useTelegramId hook and haptics util"
```

---

## Task 3 — `BottomNav` component + tab routing state in `App.tsx`

**Files:**
- Create: `apps/web/src/components/BottomNav.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/index.css` (safe-area padding utility)

**Why:** introduce the bottom nav scaffold and a tab state *without* changing any existing surface yet. After this task, the user sees two tabs (`Teman` + `Sembang`) at the bottom. `Teman` still renders today's Kedai/Pakar segment (unchanged); `Sembang` renders today's `ConversationList` in a full-screen shell. Kedai is still reachable exactly as before.

- [ ] **Step 1: Create `BottomNav.tsx`**

```tsx
// apps/web/src/components/BottomNav.tsx
import { t } from "../lib/i18n";
import { MessageCircle, Users } from "../lib/icons";
import { selectionChange } from "../lib/haptics";

export type Tab = "teman" | "sembang";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: Props) {
  const select = (tab: Tab) => {
    if (tab !== active) selectionChange();
    onChange(tab);
  };

  const item = (tab: Tab, label: string, Icon: typeof Users) => {
    const isActive = active === tab;
    return (
      <button
        key={tab}
        onClick={() => select(tab)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-transform active:scale-95"
        style={{
          color: isActive ? "var(--tg-theme-text-color)" : "var(--tg-theme-hint-color)",
        }}
      >
        <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
        <span className="text-[11px] font-semibold leading-none mt-0.5">{label}</span>
      </button>
    );
  };

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-30 flex border-t bottom-nav-safe"
      style={{
        background: "var(--tg-theme-bg-color)",
        borderColor: "color-mix(in srgb, var(--tg-theme-text-color) 8%, transparent)",
      }}
    >
      {item("teman", t("navTeman"), Users)}
      {item("sembang", t("navSembang"), MessageCircle)}
    </nav>
  );
}
```

- [ ] **Step 2: Check `Users` icon exists in `lib/icons.ts`**

Run: `grep -E "^export.*(Users|MessageCircle)" apps/web/src/lib/icons.ts`
If `Users` is missing, add it from `lucide-react`:

```ts
// apps/web/src/lib/icons.ts — add alongside existing re-exports
export { Users } from "lucide-react";
```

- [ ] **Step 3: Add a safe-area utility class in `index.css`**

Append to `apps/web/src/index.css` (near other utilities):

```css
/* Bottom-nav + content safe-area awareness */
.bottom-nav-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
.with-bottom-nav-gutter { padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px)); }
```

- [ ] **Step 4: Refactor `App.tsx` top-level state**

Replace the existing `page` state (which mixes tabs and stack views) with two orthogonal states: `tab` (persistent bottom-nav destination) and `stack` (push/pop modal-style views).

Key diff sketch (full file):

```tsx
import { useState, useEffect } from "react";
// ...existing imports...
import { BottomNav, type Tab } from "./components/BottomNav";
import { useTelegramId } from "./lib/useTelegramId";

type Stack =
  | { kind: "none" }
  | { kind: "detail"; agent: Agent }
  | { kind: "chat"; agent: Agent; conversationId?: string; merchant?: { id: string; name: string } };

export function App() {
  detectLocale();
  const telegramId = useTelegramId();
  const [tab, setTab] = useState<Tab>("teman");
  const [stack, setStack] = useState<Stack>({ kind: "none" });

  // Home-tab-only UI state (will shrink in later tasks)
  const [homeTab, setHomeTab] = useState<"kedai" | "pakar">("kedai");
  const [search, setSearch] = useState("");
  const [userPlan, setUserPlan] = useState("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasConversations, setHasConversations] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    if (!telegramId) return;
    fetch(`/api/users/me?telegramId=${telegramId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) {
          setUserPlan(data.plan);
          setPlanExpiresAt(typeof data.planExpiresAt === "number" ? data.planExpiresAt : null);
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => setShowOnboarding(true));

    fetch(`/api/conversations?telegramId=${telegramId}&limit=1`)
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((data: any) => {
        if ("any" in data) setHasConversations(data.any);
        else setHasConversations(Array.isArray(data.conversations) && data.conversations.length > 0);
      })
      .catch(() => {});
  }, [telegramId]);

  useEffect(() => { setSearch(""); }, [homeTab]);

  const openDetail = (agent: Agent) => setStack({ kind: "detail", agent });
  const openChat = (agent: Agent, conversationId?: string, merchant?: { id: string; name: string }) =>
    setStack({ kind: "chat", agent, conversationId, merchant });
  const popStack = () => setStack({ kind: "none" });

  const handleSelectConversation = (agentId: string, conversationId: string) => {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent) openChat(agent, conversationId);
  };

  const handleSelectMerchant = (merchantId: string, merchantName: string) => {
    const jiran = AGENTS.find((a) => a.id === "jiran");
    if (!jiran) return;
    openChat(jiran, undefined, { id: merchantId, name: merchantName });
  };

  const handleOnboardingComplete = (agent: Agent) => {
    setShowOnboarding(false);
    openDetail(agent);
  };

  const handleInvite = () => {
    if (!telegramId) return;
    const link = `https://t.me/aman_agent_platform_bot?start=ref_${telegramId}`;
    navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  if (!telegramId) return <Landing />;
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  // Stack views take over the whole screen — no bottom nav shown.
  if (stack.kind === "chat") {
    return (
      <ChatView
        agent={stack.agent}
        onBack={popStack}
        conversationId={stack.conversationId}
        initialMerchantId={stack.merchant?.id}
        initialMerchantName={stack.merchant?.name}
      />
    );
  }
  if (stack.kind === "detail") {
    return (
      <AgentDetail
        agent={stack.agent}
        onStartChat={() => openChat(stack.agent)}
        onBack={popStack}
        userPlan={userPlan}
      />
    );
  }

  // Tab views
  return (
    <div className="with-bottom-nav-gutter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {tab === "teman" && (
        <>
          <Header />
          {/* TEMP: keep existing search + Kedai/Pakar segment + content for now */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={homeTab === "kedai" ? t("searchKedaiPlaceholder") : t("searchPakarPlaceholder")}
          />
          {/* ... unchanged invite banner + segmented tabs + KedaiList/AgentGrid ... */}
          {/* Keep the floating continue-conversation chip temporarily — task 7 removes it. */}
        </>
      )}
      {tab === "sembang" && (
        <ConversationList
          onSelect={handleSelectConversation}
          onBack={() => setTab("teman")}
        />
      )}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
```

Keep the existing Teman body exactly as-is in this task — the segmented tab, KedaiList, AgentGrid, invite banner, floating chip all stay. The only behavioural changes in task 3 are:

1. Users now see a bottom nav bar at the bottom of the home view.
2. Tapping `Sembang` renders today's `ConversationList` full-screen.
3. The `AgentDetail` / `ChatView` stack views take the whole screen (no bottom nav over chat).

- [ ] **Step 5: Typecheck and build**

Run:
```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web build
```
Expected: both succeed.

- [ ] **Step 6: Manual browser check**

```bash
pnpm --filter @aman-tg/web dev
```
Open the dev URL in Telegram web view (or a browser with `window.Telegram` mock if available). Verify:

- Bottom nav shows two tabs, `Teman` is active by default.
- Tapping `Sembang` switches content to the history list.
- Tapping an agent in the grid opens AgentDetail (bottom nav hidden).
- Tapping "Start chat" opens ChatView (bottom nav hidden).
- "← Back" returns to Teman with bottom nav restored.
- Bottom nav doesn't overlap the last row of cards (gutter class works).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/BottomNav.tsx apps/web/src/App.tsx apps/web/src/index.css apps/web/src/lib/icons.ts
git commit -m "feat(web): add BottomNav with Teman/Sembang; split tab vs stack routing in App"
```

---

## Task 4 — Sembang: upgrade `ConversationList` to grouped, full-screen history

**Files:**
- Create: `apps/web/src/lib/timeGrouping.ts`
- Create: `apps/web/src/lib/timeGrouping.test.ts`
- Create: `apps/web/src/components/Sembang.tsx`
- Modify: `apps/web/src/App.tsx` (swap `ConversationList` for `Sembang` in the tab render)
- Leave: `apps/web/src/components/ConversationList.tsx` — delete in task 10 cleanup.

**Why:** Sembang is a first-class tab now. It needs time grouping (`Today`, `Yesterday`, `This week`, `Older`), a proper title, and an empty state that points back to Teman. Back button is removed — bottom nav handles that.

- [ ] **Step 1: Write the failing test for `groupConversationsByTime`**

```ts
// apps/web/src/lib/timeGrouping.test.ts
import { describe, it, expect } from "vitest";
import { groupConversationsByTime } from "./timeGrouping";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-04-14T10:00:00Z").getTime();

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

  it("puts items ≥ 7 days old in older", () => {
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
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @aman-tg/web test`
Expected: FAIL (`groupConversationsByTime` not found).

- [ ] **Step 3: Implement `timeGrouping.ts`**

Day boundaries use local time (user's device), not UTC, so "Today" matches what a human would say.

```ts
// apps/web/src/lib/timeGrouping.ts
export interface TimedItem { updated_at: number; [k: string]: unknown }

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

export function groupConversationsByTime<T extends TimedItem>(
  items: T[],
  now: number = Date.now(),
): Grouped<T> {
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000; // last 7 days incl. today

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
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @aman-tg/web test`
Expected: all 5 tests PASS.

- [ ] **Step 5: Create `Sembang.tsx`**

```tsx
// apps/web/src/components/Sembang.tsx
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
    if (!telegramId) { setLoading(false); return; }
    const ac = new AbortController();
    fetch(`/api/conversations?telegramId=${telegramId}`, { signal: ac.signal })
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
                <span className="text-xl flex-shrink-0">{agent?.icon || "💬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{agent?.name || conv.agent_id}</span>
                    <span className="text-[11px] flex-shrink-0" style={{ color: "var(--tg-theme-hint-color)" }}>
                      {timeAgo(conv.updated_at)}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--tg-theme-hint-color)" }}>
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
        className="px-4 pt-5 pb-3 flex items-end justify-between"
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
              <MessageCircle size={24} strokeWidth={1.8} style={{ color: "var(--tg-theme-hint-color)" }} />
            </div>
            <p className="text-base font-semibold mb-1">{t("sembangEmptyTitle")}</p>
            <p className="text-sm mb-5" style={{ color: "var(--tg-theme-hint-color)" }}>
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
```

- [ ] **Step 6: Wire `Sembang` into `App.tsx`**

Replace the `ConversationList` render in the `tab === "sembang"` branch:

```tsx
{tab === "sembang" && (
  <Sembang
    onSelect={handleSelectConversation}
    onGoToTeman={() => setTab("teman")}
  />
)}
```

Remove the `ConversationList` import from `App.tsx`. Add `import { Sembang } from "./components/Sembang";`. Do NOT delete `ConversationList.tsx` yet — task 10 cleans up.

- [ ] **Step 7: Typecheck, test, build**

```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web test
pnpm --filter @aman-tg/web build
```

- [ ] **Step 8: Manual browser check**

- Tap `Sembang`: shows title "Sembang", groups labelled correctly, rows tap through to ChatView primed with that conversation.
- Empty state (account with no history): shows empty state + CTA back to Teman.
- Rows show agent icon, name, last-message snippet, relative time.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/timeGrouping.ts apps/web/src/lib/timeGrouping.test.ts apps/web/src/components/Sembang.tsx apps/web/src/App.tsx
git commit -m "feat(web): Sembang screen with time-grouped history"
```

---

## Task 5 — Add Jiran's inline merchant section to `AgentDetail`

**Files:**
- Create: `apps/web/src/components/JiranMerchantSection.tsx`
- Modify: `apps/web/src/components/AgentDetail.tsx` — render the section only when `agent.id === "jiran"`, replace the generic "Share this agent" block with agent-specific suggestion chips, add Jiran example prompts.

**Why:** the spec puts the merchant directory exactly here. Do it *before* removing the Kedai tab so merchants remain reachable from two places temporarily (fail-safe).

- [ ] **Step 1: Extract merchant card rendering into `JiranMerchantSection.tsx`**

This component owns the merchant fetch + filter chips + list, independent of the old `KedaiList` page wrapper. Reuse `KedaiCard` for the per-merchant rendering.

```tsx
// apps/web/src/components/JiranMerchantSection.tsx
import { useEffect, useMemo, useState } from "react";
import { KedaiCard } from "./KedaiCard";
import { Store } from "../lib/icons";
import { t } from "../lib/i18n";

interface Merchant {
  id: string;
  name: string;
  description: string;
  type: "home_food" | "kedai_makan" | string;
  subcategory: string;
  address: string;
  operating_hours: string;
  notes: string;
  price_min: number | null;
  price_max: number | null;
  item_count: number;
  popular_items: { id: string; name: string; price: number }[];
}

type Filter = "all" | "home_food" | "kedai_makan";

interface Props {
  onSelectMerchant: (id: string, name: string) => void;
}

const CHIPS: { id: Filter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "home_food", label: "Bisnes Rumah" },
  { id: "kedai_makan", label: "Kedai Makan" },
];

export function JiranMerchantSection({ onSelectMerchant }: Props) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/merchants", { signal: ac.signal })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setMerchants(data.merchants ?? []))
      .catch((e) => { if (e.name !== "AbortError") setError(true); })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = useMemo(
    () => filter === "all" ? merchants : merchants.filter((m) => m.type === filter),
    [merchants, filter],
  );

  return (
    <div className="px-4 pb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--tg-theme-hint-color)" }}
        >
          {t("jiranKedaiHeading")}
        </h2>
        {!loading && !error && merchants.length > 0 && (
          <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
            {t("jiranKedaiCount", { n: merchants.length })}
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {CHIPS.map((c) => {
          const active = filter === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: active ? "var(--tg-theme-button-color)" : "var(--tg-theme-secondary-bg-color)",
                color: active ? "var(--tg-theme-button-text-color)" : "var(--tg-theme-text-color)",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse"
                 style={{ background: "var(--tg-theme-secondary-bg-color)" }} />
          ))}
        </div>
      )}
      {error && (
        <p className="text-sm text-center py-6" style={{ color: "var(--tg-theme-hint-color)" }}>
          {t("somethingWrong")}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "var(--tg-theme-secondary-bg-color)" }}
          >
            <Store size={22} strokeWidth={1.8} style={{ color: "var(--tg-theme-hint-color)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            {t("jiranKedaiEmpty")}
          </p>
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((m) => (
            <KedaiCard key={m.id} merchant={m} onTap={() => onSelectMerchant(m.id, m.name)} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Jiran to `EXAMPLE_PROMPTS` in `AgentDetail.tsx`**

```ts
const EXAMPLE_PROMPTS: Record<string, string[]> = {
  // ...existing entries...
  jiran: ["Tapau nasi lemak untuk 2", "Apa kedai buka sekarang?", "Order kek coklat"],
  todo: ["Add task: call mom", "What are my tasks today?", "Mark laundry as done"],
};
```

- [ ] **Step 3: Render `JiranMerchantSection` in `AgentDetail`**

Add import:

```tsx
import { JiranMerchantSection } from "./JiranMerchantSection";
```

After the "Example prompts" block (before "Share"), insert:

```tsx
{agent.id === "jiran" && (
  <>
    <div className="px-4 pb-2">
      <div className="flex items-center gap-3" aria-hidden>
        <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--tg-theme-text-color) 10%, transparent)" }} />
        <span className="text-[11px] tracking-[0.22em] uppercase"
              style={{ color: "var(--tg-theme-hint-color)" }}>· ✦ ·</span>
        <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--tg-theme-text-color) 10%, transparent)" }} />
      </div>
    </div>
    <JiranMerchantSection
      onSelectMerchant={(id, name) => {
        // defer to parent via a new prop — see step 4
        onSelectMerchant?.(id, name);
      }}
    />
  </>
)}
```

- [ ] **Step 4: Thread `onSelectMerchant` through `AgentDetail` props**

Extend `Props`:

```ts
interface Props {
  agent: Agent;
  onStartChat: () => void;
  onBack: () => void;
  userPlan?: string;
  onSelectMerchant?: (merchantId: string, merchantName: string) => void;
}
```

- [ ] **Step 5: Wire `onSelectMerchant` in `App.tsx`**

Inside the stack-detail render, pass:

```tsx
<AgentDetail
  agent={stack.agent}
  onStartChat={() => openChat(stack.agent)}
  onBack={popStack}
  userPlan={userPlan}
  onSelectMerchant={handleSelectMerchant}
/>
```

- [ ] **Step 6: Typecheck and build**

```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web build
```

- [ ] **Step 7: Manual browser check**

- From Pakar tab, tap Jiran → AgentDetail shows Jiran's intro, example prompts *and* the "Kedai berhampiran" section below with filter chips + merchant cards.
- Tap a merchant → ChatView opens primed with that merchant (same as before).
- Open any non-Jiran agent → no merchant section renders.
- Count renders in the section header (e.g. "12 kedai").

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/JiranMerchantSection.tsx apps/web/src/components/AgentDetail.tsx apps/web/src/App.tsx
git commit -m "feat(web): inline Jiran merchant section inside AgentDetail"
```

---

## Task 6 — Remove the Kedai top-tab, add `CategoryChips` on Teman

**Files:**
- Create: `apps/web/src/components/CategoryChips.tsx`
- Modify: `apps/web/src/App.tsx` — delete `homeTab` state and its render branches; render `AgentGrid` with `CategoryChips` filter; keep search and invite banner.
- Modify: `apps/web/src/components/AgentGrid.tsx` — accept a `category` prop, render a small `{n} kedai` pill on Jiran's card.
- Modify: `apps/web/src/components/AgentCard.tsx` (if needed) to display the pill. If the pill lives in AgentGrid's render wrapper, no AgentCard change is needed — prefer that.

**Why:** Jiran's detail now hosts the merchants. The top Kedai/Pakar segment no longer has a purpose. Replace it with a category filter that *also* surfaces Jiran's services clearly.

- [ ] **Step 1: Create `CategoryChips.tsx`**

Use the existing `AGENT_CATEGORIES` export from `@aman-tg/shared`. Add the localised labels via `t()` where possible (fall back to the category's built-in label).

```tsx
// apps/web/src/components/CategoryChips.tsx
import { AGENT_CATEGORIES } from "@aman-tg/shared";
import { t } from "../lib/i18n";
import { selectionChange } from "../lib/haptics";

const LABEL_KEYS: Record<string, string> = {
  all: "all",
  productivity: "productivity",
  coding: "coding",
  business: "business",
  education: "education",
  personal: "personal",
  lifestyle: "lifestyle",
  services: "categoryServices",
};

interface Props {
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategoryChips({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
      {AGENT_CATEGORIES.map((c) => {
        const active = value === c.id;
        const key = LABEL_KEYS[c.id] ?? c.id;
        return (
          <button
            key={c.id}
            onClick={() => { selectionChange(); onChange(c.id); }}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all inline-flex items-center gap-1.5"
            style={{
              background: active ? "var(--tg-theme-button-color)" : "var(--tg-theme-secondary-bg-color)",
              color: active ? "var(--tg-theme-button-text-color)" : "var(--tg-theme-text-color)",
            }}
          >
            <span aria-hidden>{c.icon}</span>
            {t(key)}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Teach `AgentGrid` about a `category` prop and the Jiran pill**

Read `apps/web/src/components/AgentGrid.tsx` and modify it to:

1. Accept `category?: string` (default `"all"`). When not `"all"`, filter by `agent.category === category`.
2. Render a small pill on the Jiran card showing merchant count. The pill is absolute-positioned top-right of the card. To avoid a round-trip to the API here, accept a `jiranMerchantCount?: number` prop from `App.tsx` (App already has the count when it fetches merchants — see step 4).

Sketch (append the pill inside whichever wrapper renders `AgentCard`):

```tsx
{agent.id === "jiran" && typeof jiranMerchantCount === "number" && jiranMerchantCount > 0 && (
  <span
    className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
    style={{
      background: "color-mix(in srgb, var(--tg-theme-button-color) 80%, transparent)",
      color: "var(--tg-theme-button-text-color)",
    }}
  >
    {t("agentCardJiranPill", { n: jiranMerchantCount })}
  </span>
)}
```

Make the card container `position: relative`.

- [ ] **Step 3: Refactor Teman render in `App.tsx`**

Remove: the `homeTab` state, the segmented Kedai/Pakar tab div, the `KedaiList` branch, the `searchKedaiPlaceholder`/`searchPakarPlaceholder` switch.

Add:
- `const [category, setCategory] = useState<string>("all");`
- `const [jiranMerchantCount, setJiranMerchantCount] = useState<number | null>(null);`
- An effect fetching `/api/merchants` just for the count (cached — fetch once per mount). Abort on unmount.
- Render sequence on Teman: `<Header />` → `<SearchBar value={search} onChange={setSearch} placeholder={t("searchUnifiedPlaceholder")} />` → invite banner (existing logic) → `<CategoryChips value={category} onChange={setCategory} />` → `<AgentGrid onSelect={openDetail} userPlan={userPlan} searchQuery={search} category={category} jiranMerchantCount={jiranMerchantCount ?? undefined} />`.

Sketch of the Jiran count effect:

```ts
useEffect(() => {
  const ac = new AbortController();
  fetch("/api/merchants", { signal: ac.signal })
    .then((r) => r.ok ? r.json() : { merchants: [] })
    .then((data) => setJiranMerchantCount((data.merchants ?? []).length))
    .catch(() => {});
  return () => ac.abort();
}, []);
```

- [ ] **Step 4: Remove the import of `KedaiList` and the `Briefcase` / `Store` icon usages that were only for the segment tab**

Keep imports of icons used elsewhere untouched.

- [ ] **Step 5: Typecheck and build**

```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web build
```

- [ ] **Step 6: Manual browser check**

- Teman renders: header → search bar (single placeholder) → invite banner (if applicable) → category chips → agent grid.
- No top-level Kedai/Pakar segment remains.
- Tapping category "Servis" filters the grid to Jiran (and any future services-category agents).
- Jiran's card shows a pill like "12 kedai".
- Tapping Jiran's card → AgentDetail → merchant section visible there (same as task 5).
- Kedai is no longer a top-level tab.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/CategoryChips.tsx apps/web/src/components/AgentGrid.tsx apps/web/src/App.tsx
git commit -m "refactor(web): replace Kedai top-tab with CategoryChips; Jiran card shows merchant-count pill"
```

---

## Task 7 — `ResumeStrip` on Teman; remove floating "Continue a conversation" chip

**Files:**
- Create: `apps/web/src/components/ResumeStrip.tsx`
- Modify: `apps/web/src/App.tsx` — delete floating chip render and `hasConversations` logic; wire `ResumeStrip` above `CategoryChips` on Teman.

**Why:** the floating chip is replaced by a first-class strip that previews up to 5 recent conversations. Sembang tab still holds the full list.

- [ ] **Step 1: Create `ResumeStrip.tsx`**

```tsx
// apps/web/src/components/ResumeStrip.tsx
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
    if (!telegramId) { setLoaded(true); return; }
    const ac = new AbortController();
    fetch(`/api/conversations?telegramId=${telegramId}&limit=5`, { signal: ac.signal })
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
                <span className="text-xs font-semibold truncate">{agent?.name || conv.agent_id}</span>
              </div>
              <p className="text-[11px] leading-snug line-clamp-2"
                 style={{ color: "var(--tg-theme-hint-color)" }}>
                {conv.title || t("newConversation")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into Teman render in `App.tsx`**

After the invite banner, before `CategoryChips`:

```tsx
<ResumeStrip onSelect={handleSelectConversation} />
```

- [ ] **Step 3: Remove floating chip**

Delete the `hasConversations` state, its fetch effect, and the `<button>` that renders `continueConversation`. Remove now-unused `MessageCircle` / `ChevronRight` imports if nothing else uses them.

- [ ] **Step 4: Typecheck and build**

```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web build
```

- [ ] **Step 5: Manual browser check**

- Account with no history: no strip renders, no floating chip renders.
- Account with history: strip appears between invite banner and category chips, max 5 cards, horizontal scroll, tap resumes the conversation.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ResumeStrip.tsx apps/web/src/App.tsx
git commit -m "feat(web): ResumeStrip on Teman; remove floating continue-conversation chip"
```

---

## Task 8 — Unified search (agents + Jiran's shops)

**Files:**
- Create: `apps/web/src/lib/searchFilters.ts`
- Create: `apps/web/src/lib/searchFilters.test.ts`
- Modify: `apps/web/src/App.tsx` — render a second results block below the agent grid when `search` is non-empty and matching merchants exist.

**Why:** the spec says one search bar finds agents AND Jiran's shops. Agents are already filtered inside `AgentGrid`; add a "Shops (via Jiran)" section underneath when relevant.

- [ ] **Step 1: Write the failing test for `filterMerchantsByQuery`**

```ts
// apps/web/src/lib/searchFilters.test.ts
import { describe, it, expect } from "vitest";
import { filterMerchantsByQuery } from "./searchFilters";

const m = (over: Partial<any> = {}) => ({
  id: "x",
  name: "Warung Kak Siti",
  description: "Home food",
  subcategory: "nasi",
  popular_items: [{ id: "i1", name: "Nasi Lemak", price: 6 }],
  ...over,
});

describe("filterMerchantsByQuery", () => {
  it("returns empty on empty query", () => {
    expect(filterMerchantsByQuery([m()], "")).toEqual([]);
  });

  it("matches name case-insensitively", () => {
    expect(filterMerchantsByQuery([m()], "kak").length).toBe(1);
  });

  it("matches popular items", () => {
    expect(filterMerchantsByQuery([m()], "nasi lemak").length).toBe(1);
  });

  it("does not match unrelated query", () => {
    expect(filterMerchantsByQuery([m()], "pizza")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @aman-tg/web test`
Expected: FAIL.

- [ ] **Step 3: Implement `searchFilters.ts`**

```ts
// apps/web/src/lib/searchFilters.ts
export interface SearchableMerchant {
  id: string;
  name: string;
  description: string;
  subcategory: string;
  popular_items: { id: string; name: string; price: number }[];
}

export function filterMerchantsByQuery<T extends SearchableMerchant>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((m) => {
    const hay = [
      m.name,
      m.description,
      m.subcategory,
      ...m.popular_items.map((i) => i.name),
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm --filter @aman-tg/web test`
Expected: PASS.

- [ ] **Step 5: Render the "Shops (via Jiran)" block in `App.tsx`**

Store a `merchants` array in `App.tsx` (single fetch, reused for both the count and search).

```ts
const [merchants, setMerchants] = useState<Merchant[]>([]);
useEffect(() => {
  const ac = new AbortController();
  fetch("/api/merchants", { signal: ac.signal })
    .then((r) => (r.ok ? r.json() : { merchants: [] }))
    .then((d) => setMerchants(d.merchants ?? []))
    .catch(() => {});
  return () => ac.abort();
}, []);
const jiranMerchantCount = merchants.length;
```

Underneath the `AgentGrid`, when `search.trim().length > 0`:

```tsx
{search.trim().length > 0 && (() => {
  const hits = filterMerchantsByQuery(merchants, search);
  if (hits.length === 0) return null;
  return (
    <div className="px-4 mt-2 mb-6">
      <div
        className="text-[11px] font-semibold tracking-wider uppercase mb-2"
        style={{ color: "var(--tg-theme-hint-color)" }}
      >
        {t("searchResultsShops")}
      </div>
      <div className="space-y-3">
        {hits.map((m) => (
          <KedaiCard key={m.id} merchant={m} onTap={() => handleSelectMerchant(m.id, m.name)} />
        ))}
      </div>
    </div>
  );
})()}
```

Import `KedaiCard` and `filterMerchantsByQuery` in `App.tsx`.

- [ ] **Step 6: Typecheck, test, build**

```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web test
pnpm --filter @aman-tg/web build
```

- [ ] **Step 7: Manual browser check**

- Typing "code" filters agents (existing behaviour), no shops block appears.
- Typing "nasi" shows matching agents (probably none) + a "Kedai (via Jiran)" block with merchant cards.
- Tapping a shop result opens ChatView with Jiran + that merchant primed.
- Clearing search restores the full grid and hides the shops block.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/searchFilters.ts apps/web/src/lib/searchFilters.test.ts apps/web/src/App.tsx
git commit -m "feat(web): unified search — surface Jiran shop matches alongside agents"
```

---

## Task 9 — Extract `HeaderMenu` with Akaun items (plan, invite, language, help)

**Files:**
- Create: `apps/web/src/components/HeaderMenu.tsx`
- Modify: `apps/web/src/components/Header.tsx` — delegate menu to `HeaderMenu`; keep the usage bar and greeting as today.

**Why:** the spec puts account actions in the header menu. Today's menu only has "Reset data". Add plan status, invite, language toggle, help/about. Keep the component lean — it's just a popover.

- [ ] **Step 1: Create `HeaderMenu.tsx`**

Extract the existing menu popover from `Header.tsx` (rows 85+ approximately — "onClick={onReset}" block) into a separate component, then extend with new rows. Props needed: `plan`, `planExpiresAt`, `onReset`, `onInvite`, `onToggleLocale`, `onClose`.

```tsx
// apps/web/src/components/HeaderMenu.tsx
import { useEffect, useRef } from "react";
import { t, getLocale } from "../lib/i18n";
import { RotateCcw, Gift, Globe, HelpCircle } from "../lib/icons";

interface Props {
  plan: string;
  planExpiresAt: number | null;
  onReset: () => void;
  onInvite: () => void;
  onToggleLocale: () => void;
  onClose: () => void;
}

export function HeaderMenu({ plan, planExpiresAt, onReset, onInvite, onToggleLocale, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [onClose]);

  const row = (label: string, Icon: typeof RotateCcw, onClick: () => void) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-xl"
      style={{ color: "var(--tg-theme-text-color)" }}
    >
      <Icon size={16} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-56 z-40 fade-in rounded-2xl p-2 card-soft"
      style={{ background: "var(--tg-theme-secondary-bg-color)" }}
    >
      <div
        className="px-3 py-2 text-[11px] uppercase tracking-wider"
        style={{ color: "var(--tg-theme-hint-color)" }}
      >
        {plan === "pro" ? "Pro" : plan === "team" ? "Team" : t("free")}
        {planExpiresAt && (
          <span> · {new Date(planExpiresAt).toLocaleDateString()}</span>
        )}
      </div>
      {row(t("inviteFriends"), Gift, onInvite)}
      {row(`${t("menu")} · ${getLocale().toUpperCase()}`, Globe, onToggleLocale)}
      {row(t("resetData"), RotateCcw, onReset)}
      {row("About", HelpCircle, () => {
        window.open("https://aman.kooleklabs.com", "_blank");
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire `HeaderMenu` into `Header.tsx`**

Replace the inline menu popover JSX with `<HeaderMenu … />`. Keep the menu button that toggles `menuOpen`. Pass:

- `plan={usage?.plan ?? "free"}` — if `usage` null yet, default `"free"`.
- `planExpiresAt` — accept a new optional prop on `Header`, passed down from `App.tsx` (same value already in state).
- `onReset` — existing handler.
- `onInvite` — new optional prop, fall back to no-op if absent.
- `onToggleLocale` — small local function that cycles `en → ms → id → en` via `detectLocale` (or a new export `setLocale` in `i18n.ts`).
- `onClose={() => setMenuOpen(false)}`.

- [ ] **Step 3: Add `setLocale` helper in `i18n.ts`**

```ts
export function setLocale(l: Locale) {
  currentLocale = l;
}

export function cycleLocale() {
  const order: Locale[] = ["en", "ms", "id"];
  const next = order[(order.indexOf(currentLocale) + 1) % order.length];
  setLocale(next);
}
```

*(Note: forcing a re-render on locale cycle is not solved by this — but users can tap the refresh-after-language UX exists or we add a `window.location.reload()` for now. Keep the plan simple: cycle writes the locale and reloads.)*

Simplest `onToggleLocale`:

```tsx
const onToggleLocale = () => { cycleLocale(); window.location.reload(); };
```

- [ ] **Step 4: Pass `planExpiresAt` and `onInvite` from `App.tsx`**

```tsx
<Header planExpiresAt={planExpiresAt} onInvite={handleInvite} />
```

And extend `Header` props.

- [ ] **Step 5: Typecheck, test, build**

```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web test
pnpm --filter @aman-tg/web build
```

- [ ] **Step 6: Manual browser check**

- Tapping the `⋯` menu shows a popover with: plan status row, Invite friends, Language (EN/MS/ID toggle), Reset data, About.
- Invite triggers the clipboard copy (same as banner).
- Language row cycles locale and reloads; localised strings update.
- Reset behaves as before.
- Tapping outside closes the popover.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/HeaderMenu.tsx apps/web/src/components/Header.tsx apps/web/src/lib/i18n.ts apps/web/src/App.tsx
git commit -m "feat(web): Akaun actions in HeaderMenu (plan, invite, language, help)"
```

---

## Task 10 — Cleanup & verification

**Files:**
- Delete: `apps/web/src/components/ConversationList.tsx` (replaced by `Sembang`)
- Delete: `apps/web/src/components/KedaiList.tsx` (replaced by `JiranMerchantSection`)
- Modify: `apps/web/src/lib/i18n.ts` — remove now-unused keys: `kedai`, `pakar`, `searchKedaiPlaceholder`, `searchPakarPlaceholder`, `tryPakar`, `continueConversation`, `noMerchantsToday`, `noMerchantsHint` (only if not referenced elsewhere — verify with grep).
- Modify: `apps/web/src/lib/icons.ts` — remove re-exports that are no longer used (only if unused).

- [ ] **Step 1: Grep for usage before deleting**

```bash
grep -rn "ConversationList" apps/web/src
grep -rn "KedaiList" apps/web/src
grep -rn "\"kedai\"\\|\"pakar\"" apps/web/src
grep -rn "searchKedaiPlaceholder\\|searchPakarPlaceholder\\|tryPakar\\|continueConversation" apps/web/src
```

Only delete a file or a key if its only references are in `i18n.ts` itself.

- [ ] **Step 2: Delete unused files and unused keys**

```bash
git rm apps/web/src/components/ConversationList.tsx
git rm apps/web/src/components/KedaiList.tsx
```

Edit `i18n.ts` to remove keys confirmed unused in step 1.

- [ ] **Step 3: Typecheck, test, build**

```bash
pnpm --filter @aman-tg/web typecheck
pnpm --filter @aman-tg/web test
pnpm --filter @aman-tg/web build
```

- [ ] **Step 4: Run the full QA checklist in a dev browser**

Manually walk through each journey:

- [ ] First-launch Landing still renders outside Telegram.
- [ ] New-user onboarding → picks goal → AgentDetail → ChatView.
- [ ] Returning user opens to Teman; ResumeStrip shows ≤5 most recent.
- [ ] Category chips filter the grid; "Servis" filters to Jiran.
- [ ] Jiran's card shows the "N kedai" pill.
- [ ] Tapping Jiran's card → AgentDetail → scroll → merchant section with filter chips and cards.
- [ ] Tapping a merchant → ChatView primed with that merchant.
- [ ] Typing a dish/shop term in the search shows a "Kedai (via Jiran)" block below the grid; tap opens ChatView primed.
- [ ] Sembang tab lists conversations grouped Today / Yesterday / This week / Older; empty state CTA returns to Teman.
- [ ] Header menu: plan row, Invite, Language toggle (reloads with new locale), Reset, About.
- [ ] Invite banner shows for free and expiring-pro only; copy-to-clipboard works.
- [ ] No Kedai top-tab, no floating continue-conversation chip, no duplicate Jiran entry points.
- [ ] Bottom nav does not overlap content or break safe-area.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/src
git commit -m "chore(web): remove superseded ConversationList, KedaiList, unused i18n keys"
```

- [ ] **Step 6: Open a PR**

```bash
git push -u origin feat/mini-app-user-journey
gh pr create --title "feat(web): mini-app user journey revamp (collapse Kedai into Jiran)" --body "$(cat <<'EOF'
## Summary
- Collapse the Kedai top-tab: merchant directory now lives inside Jiran's AgentDetail
- Add bottom nav with \`Teman\` (home) and \`Sembang\` (full-screen grouped history)
- Replace the floating \"Continue a conversation\" chip with a proper ResumeStrip on Teman
- Unified search: agents + Jiran's shops in one box
- Header menu now hosts Akaun actions (plan, invite, language, reset, about)

Design spec: \`docs/superpowers/specs/2026-04-14-mini-app-user-journey-design.md\`
Implementation plan: \`docs/superpowers/plans/2026-04-14-mini-app-user-journey.md\`

## Test plan
- [ ] \`pnpm --filter @aman-tg/web typecheck\`
- [ ] \`pnpm --filter @aman-tg/web test\`
- [ ] \`pnpm --filter @aman-tg/web build\`
- [ ] Walk through QA checklist in Task 10, Step 4 (spec §9 journeys)
- [ ] Verify bottom-nav safe-area on iOS Telegram client
- [ ] Verify Kedai directory reachable via Jiran on all three locales
EOF
)"
```

---

## Post-merge / follow-ons (out of scope)

- Aesthetic revamp ("Tactile Night"): Fraunces + Geist + JetBrains Mono type system, terracotta/sun accents, warm grain, haptic/spring micro-interactions. Own spec, own plan.
- Deep-link routing (`?startapp=agent_<id>` / `?startapp=kedai_<merchantId>`) — routing shape already accommodates it (stack can be seeded from a URL param on mount).
- Real unread/starred conversation state in Sembang.
- `visualViewport` handling for the Telegram keyboard pushing the bottom nav up.
