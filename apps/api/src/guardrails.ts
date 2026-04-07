/**
 * Guardrails layer — thin wrapper around @aman_asmuei/arules-core.
 *
 * Phase 7 of the aman engine v1 build sequence: this file used to contain
 * a parallel implementation of the rule parser, keyword-matching algorithm,
 * prompt injection format, and tool-call enforcement. ALL of that logic now
 * lives in @aman_asmuei/arules-core (where it was originally upstreamed
 * FROM during Phase 3).
 *
 * What stays in this file:
 *   - Loading the local apps/api/rules.md (deployment-local, not ~/.arules)
 *   - mtime-based caching so a long-running server doesn't re-parse on
 *     every check
 *   - aman-tg's tool-specific guards (private IP blocking for fetch_url)
 *     that are NOT part of the rules engine — they're hardcoded protections
 *     that apply regardless of whether a rule matches
 *
 * What moved to arules-core:
 *   - parseRules / parseRulesetFull (line-by-line markdown parser, strikethrough handling)
 *   - checkActionPure (keyword-overlap algorithm with prohibition detection)
 *   - getGuardrailsPromptPure (system prompt block builder)
 *   - checkToolCallPure (rule-driven tool call check)
 *
 * Behavior is preserved with one minor improvement: arules-core's stopword
 * list is slightly broader than this file's previous version (adds: into,
 * your, yours, ours, those, these, such, very). This makes keyword matching
 * marginally more accurate. The 2-keyword-overlap threshold is unchanged.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  type Ruleset,
  parseRules,
  checkActionPure,
  checkToolCallPure,
  getGuardrailsPromptPure,
  type CheckActionResult,
} from "@aman_asmuei/arules-core";

interface RuleCategory {
  category: string;
  rules: string[];
}

// Resolve relative to this file's package, not process.cwd()
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const RULES_PATH = process.env.RULES_PATH || path.join(__dirname, "..", "rules.md");

// ── Cached ruleset with mtime invalidation ─────────────────────────────────
//
// We keep the local cache (instead of going through arules-core's storage
// layer) for two reasons:
//
//   1. The rules file lives at apps/api/rules.md inside aman-tg's deployment,
//      not at ~/.arules — arules-core's storage backends point at the latter.
//      Keeping a local file load lets aman-tg own its deployment shape.
//   2. The aman-tg API is a long-running server. Re-reading and re-parsing
//      rules.md on every checkAction call would be wasteful. The mtime check
//      is essentially free.

let _cachedRuleset: Ruleset | null = null;
let _cachedMtime: number = 0;

function loadRuleset(): Ruleset | null {
  let mtime = 0;
  try {
    mtime = fs.statSync(RULES_PATH).mtimeMs;
  } catch {
    return null;
  }

  if (_cachedRuleset && mtime === _cachedMtime) {
    return _cachedRuleset;
  }

  try {
    const content = fs.readFileSync(RULES_PATH, "utf-8");
    _cachedRuleset = { content };
    _cachedMtime = mtime;
    console.log(
      `[GUARDRAILS] Loaded ruleset from ${RULES_PATH} (engine: arules-core)`,
    );
    return _cachedRuleset;
  } catch (err) {
    console.error(`[GUARDRAILS] Failed to load rules:`, err);
    return null;
  }
}

/**
 * Parse the local rules.md into structured rule categories.
 *
 * Returns the existing aman-tg shape `{ category, rules }` for backward
 * compatibility with any caller that consumes this function — arules-core's
 * canonical shape is `{ name, rules }`, mapped here.
 */
export function loadRules(): RuleCategory[] {
  const ruleset = loadRuleset();
  if (!ruleset) return [];
  return parseRules(ruleset).map((c) => ({
    category: c.name,
    rules: c.rules,
  }));
}

/**
 * Check if a proposed action might violate any active rules.
 *
 * Delegates to arules-core's keyword-overlap algorithm. Returns the same
 * shape this file used to expose so existing callers don't need changes.
 */
export function checkAction(action: string): CheckActionResult {
  const ruleset = loadRuleset();
  if (!ruleset) return { violations: [], safe: true };
  return checkActionPure(action, ruleset);
}

/**
 * Generate a system prompt block listing the safety-critical rules.
 *
 * Uses arules-core's default category set (Always, Never, Safety, Privacy).
 * Returns empty string if no rules are loaded — callers can append the
 * result unconditionally.
 */
export function getGuardrailsPrompt(): string {
  const ruleset = loadRuleset();
  if (!ruleset) return "";
  return getGuardrailsPromptPure(ruleset);
}

/**
 * Check a tool call against the ruleset BEFORE execution. Returns null if
 * safe, or an error message string if blocked.
 *
 * Two layers of protection:
 *   1. Rule-driven check via arules-core (matches against the loaded rules.md)
 *   2. Tool-specific hardcoded guards that apply regardless of rules
 *      (currently: blocking private IP fetches for fetch_url)
 *
 * Tool-specific guards live HERE rather than in arules-core because they're
 * not rule-expressible — they're security invariants that must hold regardless
 * of what the user puts in rules.md.
 */
export function checkToolCall(
  toolName: string,
  input: Record<string, unknown>,
): string | null {
  // Build a description of what the tool is about to do
  const descriptions: Record<
    string,
    (input: Record<string, unknown>) => string
  > = {
    fetch_url: (i) => `Fetching URL: ${i.url}`,
    delete_task: (i) => `Deleting task: ${i.task_id}`,
    add_task: (i) => `Adding task: ${i.title}`,
  };

  const describe = descriptions[toolName];
  if (!describe) return null; // No special check for this tool

  const action = describe(input);

  // Layer 1: rule-driven check via arules-core
  const ruleset = loadRuleset();
  if (ruleset) {
    const ruleResult = checkToolCallPure(action, ruleset);
    if (ruleResult !== null) {
      console.log(`[GUARDRAILS] Tool ${toolName} blocked by rule: ${ruleResult}`);
      return ruleResult;
    }
  }

  // Layer 2: tool-specific hardcoded guards
  if (toolName === "fetch_url") {
    const url = ((input.url as string) || "").toLowerCase();
    if (
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("0.0.0.0") ||
      url.match(/^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/) ||
      url.includes("metadata.google") ||
      url.includes("169.254.")
    ) {
      console.log(`[GUARDRAILS] Blocked internal URL fetch: ${url}`);
      return "Cannot fetch internal or private network URLs for security reasons.";
    }
  }

  return null;
}
