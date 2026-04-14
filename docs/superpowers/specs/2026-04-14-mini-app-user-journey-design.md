# Mini App — User Journey Revamp (Path 1: Collapse Kedai into Jiran)

**Status:** approved design, ready for implementation planning
**Date:** 2026-04-14
**Scope:** `apps/web` (Mini App) information architecture and user journey
**Out of scope:** aesthetic revamp (deferred to a follow-on spec — see §10), API changes, agent prompts, Landing page, Markdown renderer

---

## 1. Problem

The current Mini App splits home into two top-level tabs: **Kedai** (merchants) and **Pakar** (AI agents). This IA confuses users because the two tabs are not conceptual peers:

- **Pakar** is the whole product: 15 AI agents, each a distinct companion.
- **Kedai** is one feature of one agent (Jiran). Tapping a merchant calls `handleSelectMerchant` which sets `selectedAgent = jiran` and opens ChatView primed with merchant context.
- **Jiran appears in both tabs.** Same destination, two paths, no explanation.
- **Kedai is the default tab**, so a new user lands on "shops" when the brand promise is "AI agents that remember you" — immediate cognitive mismatch.
- **Conversation history is a floating chip**, hidden unless the user already has history — poor discovery of the product's most personal surface.

The root cause: the IA presents a feature as if it were a second product. One product, two labels.

## 2. Goals

- One clear mental model: *it is an AI-companion app; one companion is a neighbourhood concierge with a shop directory*.
- Promote conversation history to a first-class surface.
- Keep every current capability — merchant browsing, merchant-primed chat, invite rewards, plan chip, onboarding.
- Prepare routing to accept Telegram bot deep links (future-ready, not built now).

## 3. Non-goals

- Visual/aesthetic redesign (separate follow-on, see §10).
- Changes to API routes, merchant schema, agent definitions, or chat engine.
- New agents or features.

## 4. Approach — Path 1: collapse Kedai into Jiran

- Remove the Kedai/Pakar top-tab. Home shows the agent grid directly.
- The merchant directory moves inside **Jiran's AgentDetail** as a dedicated section.
- Add a two-destination **bottom nav**: `Teman` (home) and `Sembang` (history).
- Account-level actions (plan, invite, language, help) live in the header menu, not in nav.

## 5. Information architecture

### 5.1 Bottom nav — 2 destinations

| Tab | Contains |
|---|---|
| **Teman** (home) | Agent grid, search, resume strip, category chips, invite banner |
| **Sembang** (history) | Full conversation list grouped by time |

Fixed at the bottom with safe-area-inset awareness. Stack views (`Onboarding`, `AgentDetail`, `ChatView`) push on top of the active tab. Telegram's back button / swipe pops the stack.

### 5.2 Header (persistent across tabs)

- Left: brand lockup (`aman.`).
- Right: plan chip (Free/Pro + expiry countdown if expiring) and a `⋯` menu button.

Menu opens a sheet containing:

- Status plan (free/pro + expiry, upgrade CTA when applicable)
- Jemput kawan (referral — same flow as invite banner)
- Bahasa (BM ⇄ EN)
- Bantuan / Tentang
- Log keluar

### 5.3 Stack views (push/pop)

- `Onboarding` — only for new users (no `plan` in `/api/users/me`).
- `AgentDetail` — opened by tapping any agent card.
- `ChatView` — opened from AgentDetail, resume strip, or Sembang.

## 6. Surface: Teman (home)

Top to bottom:

1. **Header** — brand lockup + plan chip + menu.
2. **SearchBar** — unified: filters agents by name/tags and, for Jiran, surfaces matching merchants as a second grouped section ("Kedai via Jiran").
3. **Invite banner** — visible to `free` users and `pro` users with an `expiresAt`; hidden for permanent pro and team plans. (Logic unchanged from current `App.tsx`.)
4. **Resume strip** — horizontal scroll, max 5 most-recent conversations. Card shows agent icon, last-message snippet, relative timestamp. Tap resumes the exact conversation. Hidden if user has no history. Replaces the floating "Continue a conversation" chip.
5. **Category chips** — horizontal scroll, no count badges. Chips: `Semua` · `Produktif` · `Koding` · `Pendidikan` · `Peribadi` · `Gaya Hidup` · `Bisnes` · `Servis`. Default `Semua`. Replaces the old Kedai/Pakar segment.
6. **Agent grid** — 2 columns, all 15 agents. Jiran's card shows a small pill (`12 kedai`) signalling the merchant feature is discoverable inside his detail.

### Search behaviour

Search scope:
- All agents by `name`, `description`, `tags`.
- All merchants by `name`, `description`, `subcategory`, `popular_items[].name` — but routed through Jiran.

Result layout when query is non-empty:
- Section: **Teman** (matching agents) — renders in the grid.
- Section: **Kedai (via Jiran)** — renders below as a small list; tapping a merchant opens ChatView with Jiran primed.

Merchants only appear in search results when the query matches; there is no merchant-only browsing surface outside Jiran.

## 7. Surface: Sembang (history)

Promoted from a floating chip to a full screen.

- Grouped headings: `Hari ini`, `Semalam`, `Minggu ini`, `Lebih lama`.
- Each row: agent avatar, last-message preview (single line), relative timestamp (right-aligned).
- Tap row → open ChatView resumed at that conversation.
- Empty state (no history yet): friendly prompt → "Belum ada perbualan. Pilih teman awak →" with a CTA that navigates to Teman.
- Future hooks (not built now): swipe actions for archive / delete, unread dot, starred conversations.

Depends on existing `/api/conversations` endpoint.

## 8. Surface: AgentDetail

All 15 agents share the same template:

- Big agent icon, serif name, mono handle.
- Description.
- Primary CTA: `Mula sembang dengan {Name}` → opens ChatView.
- Suggestion-chip row: 2–3 example prompts per agent (data lives with the agent definition or a small static map in the web package — not a backend change).

### 8.1 Jiran's exception — inline merchant section

Below the suggestion chips, only for `agent.id === "jiran"`:

- Ornamental divider (reuse Landing's batik-inspired motif).
- Section label: `KEDAI BERHAMPIRAN` + count (`12 kedai`).
- Filter chips: `Semua`, `Bisnes Rumah`, `Kedai Makan` (same three filter values as today's Kedai tab).
- Merchant cards (reuse `KedaiCard`).
- Tap a merchant → ChatView with `initialMerchantId` + `initialMerchantName` set (the existing flow in `App.tsx`).
- Reuse current loading skeleton, error retry, and empty state from `KedaiList.tsx`.

This is the **only** place the merchant directory lives.

## 9. Journeys

| Journey | Path |
|---|---|
| New user, wants to chat with AI | Open → Onboarding → pick goal → AgentDetail → ChatView |
| Returning user, continue last chat | Open → Teman → Resume strip (first card) → ChatView |
| Wants to order food | Open → Teman → tap Jiran card (or "Servis" chip) → AgentDetail → pick merchant → ChatView primed |
| Wants to browse all past chats | Open → Sembang → pick row → ChatView |
| Power user, knows the agent | Open → Teman → Search → tap → AgentDetail → ChatView |

## 10. Follow-on: aesthetic revamp (separate spec)

The aesthetic direction explored during brainstorming — "Tactile Night": refined dark palette with Fraunces display + Geist UI, terracotta/sun accents, warm grain, haptic/spring micro-interactions — is **deferred** to a follow-on spec once the IA has landed. Doing IA first prevents wasted visual polish on screens that will be restructured.

Capture for the follow-on:
- Typography: Fraunces display + Geist UI + JetBrains Mono handles (matches Landing).
- Palette: deep ink base, warm-paper-dark surfaces, forest/terracotta/sun accents, soft-white text.
- Motion: haptic on taps, spring page transitions, stagger reveals, shimmer skeletons.
- Components to restyle: all Mini App surfaces; Landing and Markdown remain untouched.

## 11. Component inventory

### New components
- `BottomNav.tsx` — fixed bottom nav with `Teman` / `Sembang` tabs.
- `ResumeStrip.tsx` — horizontal-scroll recent conversations on Teman.
- `CategoryChips.tsx` — category filter row for the agent grid.
- `HeaderMenu.tsx` — sheet/popover for account actions (extracted from current Header).
- `JiranMerchantSection.tsx` — the inline merchant directory inside Jiran's AgentDetail.

### Modified components
- `App.tsx` — replace `Page` + `HomeTab` state with `Tab` + stack; wire bottom nav; remove Kedai top tab; remove floating chip.
- `Header.tsx` — simplify; delegate account actions to `HeaderMenu`.
- `AgentGrid.tsx` — consume `CategoryChips`; render Jiran pill.
- `AgentDetail.tsx` — render Jiran's merchant section when applicable; add suggestion chips.
- `ConversationList.tsx` → `Sembang.tsx` — upgrade to grouped screen.
- `SearchBar.tsx` — no shape change, but placeholder and downstream handling need unified agent + merchant search.

### Unchanged
- `ChatView.tsx`, `Markdown.tsx`, `Landing.tsx`, `Onboarding.tsx` (minor routing wire-up only), `KedaiCard.tsx`, `icons.ts`, `i18n.ts` (new keys added).

### Removed
- The Kedai top-tab branch in `App.tsx` (the `homeTab` state and its render).
- The floating "Continue a conversation" chip.
- `KedaiList.tsx` as a top-level page (its list body is reused inside `JiranMerchantSection`).

## 12. Risks

- **Discoverability of merchants.** Removing the dedicated Kedai tab risks users not finding Jiran's shop directory. Mitigation: Jiran pill on the agent card + unified search + "Servis" category chip.
- **Search complexity.** Unified agent + merchant search is the most subtle part. If it becomes messy, fall back to agent-only search on Teman and move merchant search inside Jiran's AgentDetail.
- **Bottom nav in Telegram webview.** Minor safe-area / keyboard concerns on iOS. Mitigation: `env(safe-area-inset-bottom)` padding and `visualViewport` resize handling — standard patterns.
- **Migration.** Telegram Mini Apps don't bookmark URLs, so there are no broken links. Users mid-conversation are unaffected (ChatView is untouched).

## 13. i18n impact

New keys needed in `i18n.ts`:
- `navTeman`, `navSembang`
- `resumeStripLabel`, `resumeStripEmpty`
- `sembangToday`, `sembangYesterday`, `sembangThisWeek`, `sembangOlder`, `sembangEmpty`, `sembangEmptyCta`
- `jiranKedaiSectionLabel`, `jiranKedaiCount(n)`
- `agentDetailStartChat(name)`, `agentDetailSuggestions`
- Existing `searchKedaiPlaceholder` / `searchPakarPlaceholder` consolidate into one `searchPlaceholder`.

## 14. Success criteria

- No top-level Kedai tab exists. Category chips replace the Kedai/Pakar segment.
- Jiran has exactly one entry point: the agent grid card. Merchants only exist inside his AgentDetail.
- Users with history see a Resume strip on Teman and a fully populated Sembang tab.
- First-launch new users follow Onboarding → AgentDetail → ChatView unchanged.
- Invite banner logic matches today (free and expiring-pro only).
- No API change, no agent prompt change, no merchant schema change.
