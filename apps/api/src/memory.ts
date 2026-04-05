/**
 * Memory layer — wraps amem-core for the Telegram Mini App.
 *
 * Provides:
 * - loadMemoryContext(): inject relevant memories into system prompt
 * - extractAndStoreMemories(): detect and store memories from conversation
 *
 * Uses telegramId as user scope for cross-agent memory.
 */

import path from "node:path";
import {
  createDatabase,
  storeMemory,
  buildContext,
  type AmemDatabase,
} from "@aman_asmuei/amem-core";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const AMEM_DB_PATH = process.env.AMEM_DB || path.join(DATA_DIR, "amem.db");

let _amemDb: AmemDatabase | null = null;

function getAmemDb(): AmemDatabase {
  if (_amemDb) return _amemDb;
  _amemDb = createDatabase(AMEM_DB_PATH);
  return _amemDb;
}

/**
 * Load relevant memories for a user and inject as system prompt context.
 * Returns a string to append to the agent's system prompt.
 */
export async function loadMemoryContext(
  telegramId: number,
  agentId: string,
  currentMessage: string,
): Promise<string> {
  try {
    const db = getAmemDb();
    const scope = `tg:${telegramId}`;

    const ctx = await buildContext(db, currentMessage, {
      scope,
      maxTokens: 800,
    });

    if (!ctx.groups || ctx.groups.length === 0) return "";

    const lines: string[] = [];
    lines.push("\n\n## What I remember about this user");

    for (const group of ctx.groups) {
      if (group.memories.length === 0) continue;
      const label = group.type.charAt(0).toUpperCase() + group.type.slice(1) + "s";
      lines.push(`\n### ${label}`);
      for (const m of group.memories) {
        lines.push(`- ${m.content}`);
      }
    }

    lines.push("\nUse these memories naturally. Don't list them — weave them into your responses.");
    return lines.join("\n");
  } catch {
    return "";
  }
}

/**
 * Clear all memories for a user.
 */
export function clearUserMemories(telegramId: number): number {
  try {
    const db = getAmemDb();
    const scope = `tg:${telegramId}`;
    const memories = db.searchByScope(scope);
    for (const m of memories) {
      db.deleteMemory(m.id);
    }
    return memories.length;
  } catch {
    return 0;
  }
}

// ── Memory extraction patterns ────────────────────────

const PATTERNS: Array<{
  type: "correction" | "decision" | "preference" | "pattern" | "fact";
  confidence: number;
  regexes: RegExp[];
}> = [
  {
    type: "correction",
    confidence: 0.95,
    regexes: [
      /\b(?:don'?t|never|stop|wrong|incorrect)\b.*\b(?:use|do|add|make)\b/i,
      /\b(?:always|must|should always)\b.*\b(?:use|do|add|make)\b/i,
      /\bno,?\s+(?:that|this|it)\s+(?:should|needs to|must)\b/i,
    ],
  },
  {
    type: "decision",
    confidence: 0.85,
    regexes: [
      /\b(?:we (?:decided|chose|agreed)|let'?s (?:go with|use|stick with))\b/i,
      /\b(?:i'?m using|we'?re using|switched to|migrated to)\b/i,
    ],
  },
  {
    type: "preference",
    confidence: 0.80,
    regexes: [
      /\b(?:i prefer|i like|i want|i always|my preference)\b/i,
      /\b(?:i usually|i tend to|i'?m used to)\b/i,
    ],
  },
  {
    type: "fact",
    confidence: 0.70,
    regexes: [
      /\b(?:i am a|i work (?:at|as|in|for)|my (?:job|role|company|team))\b/i,
      /\b(?:i live in|i'?m from|i speak|my name is)\b/i,
    ],
  },
];

/**
 * Extract and store memories from a user's message.
 * Non-blocking — fires and forgets.
 */
export function extractAndStoreMemories(
  telegramId: number,
  userMessage: string,
  agentId: string,
): void {
  // Don't block the response — run async
  setImmediate(async () => {
    try {
      if (userMessage.length < 15) return;

      const db = getAmemDb();
      const scope = `tg:${telegramId}`;

      for (const pattern of PATTERNS) {
        let matched = false;
        for (const regex of pattern.regexes) {
          if (regex.test(userMessage)) {
            matched = true;
            break;
          }
        }
        if (!matched) continue;

        // Store the memory
        await storeMemory(db, {
          content: userMessage.slice(0, 500),
          type: pattern.type,
          tags: ["telegram", `agent:${agentId}`],
          confidence: pattern.confidence,
          scope,
        });

        break; // One match per message
      }
    } catch (err) {
      console.error(`[MEMORY] Extract failed for user ${telegramId}:`, err);
    }
  });
}
