# Mini App — Tactile Night Aesthetic Revamp

**Status:** approved, ready for implementation
**Date:** 2026-04-15
**Scope:** `apps/web` Mini App chrome only
**Out of scope:** `Landing.tsx`, `Markdown.tsx`, ChatView message bubbles, API/prompts/data

---

## 1. Direction

Move the Mini App from dark-GitHub utility palette to a warm editorial night — the nocturnal sibling of the Landing. Lean into Fraunces serif display + Geist UI + JetBrains Mono, keep Telegram's dark-first reality, break from `--tg-theme-*` vars to own the brand across surfaces.

## 2. Tokens

**Colour**

| Token | Value | Use |
|---|---|---|
| `--ink-0` | `#0d0b08` | page base |
| `--ink-1` | `#171410` | elevated surface |
| `--ink-2` | `#211d18` | card |
| `--ink-3` | `#2b2621` | hovered card / chip active |
| `--paper` | `#ede5d0` | primary text |
| `--paper-2` | `#c8bda4` | secondary text |
| `--paper-3` | `#8a8272` | hint |
| `--forest` | `#4a7c5c` | services accent |
| `--terra` | `#c77a52` | primary CTA |
| `--sun` | `#d4a93b` | highlight / premium / pill |
| `--ember` | `#e85d4a` | destructive |
| `--rule` | `rgba(237,229,208,0.08)` | hairline |
| `--rule-2` | `rgba(237,229,208,0.14)` | stronger divider |

**Typography**

- `--font-display: "Fraunces", ui-serif, Georgia, serif` — page titles, agent names, section headers
- `--font-ui: "Geist", ui-sans-serif, system-ui, sans-serif` — body, UI
- `--font-mono: "JetBrains Mono", ui-monospace, monospace` — handles, timestamps, counts
- Scales: `display-lg 32/36`, `display-md 22/26`, `ui-lg 15/22`, `ui-md 13/18`, `ui-sm 11/14`, `mono-xs 11/14 tracking-0.02em`

**Motion**

- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` — reveals, slides
- `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` — button rebound
- `--dur-fast: 120ms`, `--dur-med: 220ms`, `--dur-slow: 420ms`
- Stagger step: 40ms

**Haptics** (via `lib/haptics.ts`)

- `selectionChange()` — chip/tab change
- `tap("light")` — card tap
- `tap("medium")` — nav push
- `tap("heavy")` — destructive confirm

## 3. Global treatment

- Fonts: preconnect Google Fonts and load Fraunces + Geist + JetBrains Mono at app root (already loaded for Landing — extend globally via index.css).
- Background: `--ink-0` with a paper-grain overlay fixed behind content at 4% opacity (CSS SVG noise, identical to Landing but lower opacity).
- `body` uses `--font-ui`; `h1/h2/h3` and `.display` use `--font-display`.
- Legacy `--tg-theme-*` CSS vars stay defined in `:root` for third-party/back-compat, but new components read `--ink-*` / `--paper-*`.

## 4. Component-by-component

| Component | Revamp |
|---|---|
| **Header** | Fraunces wordmark `aman.`; plan chip in mono uppercase on ink-2; menu button soft-circle; greeting in paper-2; free-tier usage bar uses `--sun` for warning |
| **HeaderMenu** | ink-2 sheet, card-soft shadow + rule border; plan row in mono; destructive reset in `--ember` |
| **BottomNav** | ink-1 surface with `--rule` top border; active tab icon + label `--paper`, inactive `--paper-3`; active gets a 2px `--sun` underline; haptic wired |
| **SearchBar** | ink-2 pill (rounded-full); ui-md input; focus state gets `--terra` halo (soft glow box-shadow) |
| **CategoryChips (in AgentGrid)** | pill chips; inactive ink-2 / paper-2; active `--terra` bg + paper text; count badge mono-xs |
| **AgentCard** | ink-2 → ink-1 subtle gradient; inner 1px `--rule`; Fraunces `display-md` name; mono handle `@{id}` below; category accent tile keeps accent fg, bg `rgba(accent, 0.12)`; Jiran pill sun bg + ink-0 text |
| **ResumeStrip** | mono-xs uppercase label; cards match AgentCard gradient but tighter; snippet in Fraunces italic paper-2 |
| **Sembang** | ui-lg Fraunces title; group labels mono-xs uppercase paper-3; row: Fraunces ui-lg agent name + ui-sm paper-2 preview + mono-xs paper-3 time; rule-2 hairline between groups |
| **AgentDetail hero** | Fraunces `display-lg` name; mono handle; ui-lg paper description; CTA button `--terra` fill + inset sheen (like Landing `.btn-ink`); ease-spring on press |
| **JiranMerchantSection** | mono-xs uppercase "Kedai Berhampiran" + mono count; ornamental divider `· ✦ ·` with rule lines (Landing motif); filter chips match CategoryChips |
| **KedaiCard** | Fraunces merchant name; mono price range; accent border uses `--sun`/`--forest` per type |
| **Onboarding** | match new hero/CTA styling; interest pills ink-2 → `--terra` on select; continue button `.btn-ink`-style |

## 5. Motion

**Staged reveal on Teman open** (CSS `animation-delay`):
- Header 0ms → SearchBar 40 → InviteBanner 80 → ResumeStrip 120 → CategoryChips 160 → AgentGrid cards 200 + 30 per card (`.reveal` class from Landing, scoped)

**Tab switch (Teman ↔ Sembang):** outgoing fade-out 120ms, incoming fade + 8px rise 220ms with `--ease-out`.

**Stack push (AgentDetail/ChatView):** slide-up-12 + fade 220ms.

**Interactive press:** `active:scale-[0.97]` + 120ms `--ease-spring`.

Respect `prefers-reduced-motion: reduce` — disable slides/reveals; keep state-change styling.

## 6. Done criteria

- Mini App visibly distinct from a stock Telegram webview; brand-consistent with Landing.
- All surfaces read the new tokens, not `--tg-theme-*` (except Markdown).
- `pnpm typecheck`, `pnpm test`, `pnpm build` clean.
- Spot-check: Header, BottomNav, AgentGrid, AgentDetail, Sembang, ChatView chrome, Onboarding — all render correctly in the dev browser.
- No regression: IA from PR #1 preserved (Jiran merchant section, Resume strip, unified search, etc.).

## 7. Known follow-ons (deferred)

- Light-theme twin (warm paper daylight variant)
- ChatView message bubble restyle
- Markdown renderer warm theme pass
- Skeleton shimmer variants
- Page-transition choreography with Motion/Framer-Motion (current: CSS-only)
