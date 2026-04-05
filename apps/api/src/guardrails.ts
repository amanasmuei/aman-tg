/**
 * Guardrails layer — portable arules integration for aman Mini App.
 *
 * Parses rules.md and provides:
 * - loadRules(): parse rules into categories
 * - checkAction(): check if an action violates any "Never" rules
 * - getGuardrailsPrompt(): inject rules into agent system prompt
 */

import fs from "node:fs";
import path from "node:path";

interface RuleCategory {
  category: string;
  rules: string[];
}

// Resolve relative to this file's package, not process.cwd()
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const RULES_PATH = process.env.RULES_PATH || path.join(__dirname, "..", "rules.md");

let _cachedRules: RuleCategory[] | null = null;
let _cachedRulesContent: string | null = null;
let _cachedMtime: number = 0;

/**
 * Parse rules.md into structured categories.
 * Caches result and reloads if file changes.
 */
export function loadRules(): RuleCategory[] {
  // Check if file has changed
  let mtime = 0;
  try {
    mtime = fs.statSync(RULES_PATH).mtimeMs;
  } catch {
    return [];
  }

  if (_cachedRules && mtime === _cachedMtime) return _cachedRules;

  try {
    const content = fs.readFileSync(RULES_PATH, "utf-8");
    _cachedRulesContent = content;
    _cachedMtime = mtime;
    _cachedRules = parseRules(content);
    console.log(`[GUARDRAILS] Loaded ${_cachedRules.length} rule categories from ${RULES_PATH}`);
    return _cachedRules;
  } catch (err) {
    console.error(`[GUARDRAILS] Failed to load rules:`, err);
    return [];
  }
}

function parseRules(content: string): RuleCategory[] {
  const categories: RuleCategory[] = [];
  const sections = content.split(/\n## /);

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split("\n");
    const category = lines[0].replace(/^#+\s*/, "").trim();
    if (!category) continue;

    const rules: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("- ")) {
        const rule = line.slice(2).trim();
        // Skip strikethrough (disabled) rules
        if (rule.startsWith("~~") && rule.endsWith("~~")) continue;
        if (rule) rules.push(rule);
      }
    }

    if (rules.length > 0) {
      categories.push({ category, rules });
    }
  }

  return categories;
}

/**
 * Check if a proposed action violates any guardrails.
 * Focuses on "Never" rules and rules with prohibition keywords.
 */
export function checkAction(action: string): {
  violations: string[];
  safe: boolean;
} {
  const categories = loadRules();
  if (categories.length === 0) return { violations: [], safe: true };

  // Collect all prohibition rules
  const prohibitions: string[] = [];

  for (const cat of categories) {
    if (cat.category.toLowerCase() === "never") {
      prohibitions.push(...cat.rules);
      continue;
    }
    // Also pick up rules with prohibition keywords in other categories
    for (const rule of cat.rules) {
      if (/\b(never|don't|do not|must not|forbidden|prohibited|refuse|decline)\b/i.test(rule)) {
        if (!prohibitions.includes(rule)) {
          prohibitions.push(rule);
        }
      }
    }
  }

  const actionLower = action.toLowerCase();
  const violations = prohibitions.filter((rule) => {
    const keywords = rule
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      // Filter out common filler words
      .filter((w) => !["that", "this", "with", "from", "about", "than", "them", "they", "their", "when", "where", "what", "which", "will", "have", "been", "would", "could", "should"].includes(w));
    // Require at least 2 keyword matches for relevance
    const matchCount = keywords.filter((kw) => actionLower.includes(kw)).length;
    return matchCount >= 2;
  });

  return { violations, safe: violations.length === 0 };
}

/**
 * Generate a guardrails section for the agent system prompt.
 * Injects the most critical rules so the LLM respects them.
 */
export function getGuardrailsPrompt(): string {
  const categories = loadRules();
  if (categories.length === 0) return "";

  const lines: string[] = [];
  lines.push("\n\n## GUARDRAILS — You MUST follow these rules:");

  for (const cat of categories) {
    // Include Always, Never, Safety, and Privacy in prompt
    const important = ["always", "never", "safety", "privacy"];
    if (!important.includes(cat.category.toLowerCase())) continue;

    lines.push(`\n### ${cat.category}`);
    for (const rule of cat.rules) {
      lines.push(`- ${rule}`);
    }
  }

  lines.push("\nViolating these rules is NOT allowed under any circumstances.");
  return lines.join("\n");
}

/**
 * Check a tool call against guardrails before execution.
 * Returns null if safe, or an error message if blocked.
 */
export function checkToolCall(toolName: string, input: Record<string, unknown>): string | null {
  // Build a description of what the tool is about to do
  const descriptions: Record<string, (input: Record<string, unknown>) => string> = {
    fetch_url: (i) => `Fetching URL: ${i.url}`,
    delete_task: (i) => `Deleting task: ${i.task_id}`,
    add_task: (i) => `Adding task: ${i.title}`,
  };

  const describe = descriptions[toolName];
  if (!describe) return null; // No special check for this tool

  const action = describe(input);
  const { violations, safe } = checkAction(action);

  if (!safe) {
    console.log(`[GUARDRAILS] Tool ${toolName} blocked: ${violations.join("; ")}`);
    return `Action blocked by guardrails: ${violations[0]}`;
  }

  // Special checks for specific tools
  if (toolName === "fetch_url") {
    const url = (input.url as string || "").toLowerCase();
    // Block internal/private network URLs
    if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes("0.0.0.0") ||
        url.match(/^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/) ||
        url.includes("metadata.google") || url.includes("169.254.")) {
      console.log(`[GUARDRAILS] Blocked internal URL fetch: ${url}`);
      return "Cannot fetch internal or private network URLs for security reasons.";
    }
  }

  return null;
}
