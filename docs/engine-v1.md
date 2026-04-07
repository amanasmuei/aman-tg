# Engine v1 — what changed for aman-tg

aman now runs on **engine v1**, a shared substrate published as 3 npm packages:

- [`@aman_asmuei/aman-core`](https://www.npmjs.com/package/@aman_asmuei/aman-core) — scope, `withScope`, `Storage<T>` (markdown + sqlite backends)
- [`@aman_asmuei/acore-core`](https://www.npmjs.com/package/@aman_asmuei/acore-core) — multi-tenant Identity layer
- [`@aman_asmuei/arules-core`](https://www.npmjs.com/package/@aman_asmuei/arules-core) — multi-tenant guardrails layer

## What it means for aman-tg

- `apps/api/guardrails.ts` is now a **thin wrapper** over `arules-core` instead of carrying its own rule parser and enforcer.
- **Same behavior**, same `apps/api/rules.md` location, same mtime caching, same private-IP guard for `fetch_url`.
- The engine is now **shared** with aman-agent, aman-mcp, and aman-plugin — one rule of how scope, identity, and guardrails work; four frontends consuming it.
- **Multi-tenant from day one**: `tg:<userId>` scopes route to SQLite at `~/.aman/engine.db` automatically — no code changes needed when you onboard real users.

## Why it matters

Any future improvement to scope handling, storage, identity sections, or guardrail enforcement now lands in **one place** and every frontend gets it. No more copy-paste between aman-tg and aman-agent.

## Migration impact

**Zero.** `pnpm install` already pulled in the new versions:

```json
"@aman_asmuei/aman-core": "^0.2.0",
"@aman_asmuei/arules-core": "^0.1.0"
```

26/26 `apps/api` tests still pass. Existing `apps/api/rules.md` files keep working unchanged.

## Learn more

- Engine architecture: https://github.com/amanasmuei/aman-core
- Identity layer: https://github.com/amanasmuei/acore-core
- Guardrails layer: https://github.com/amanasmuei/arules-core
