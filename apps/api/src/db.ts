import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, "aman.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("busy_timeout = 5000");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      language_code TEXT,
      selected_agent_id TEXT NOT NULL DEFAULT 'coding',
      plan TEXT NOT NULL DEFAULT 'free',
      messages_today INTEGER NOT NULL DEFAULT 0,
      messages_date TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_agent
      ON conversations(telegram_id, agent_id);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      reward_days INTEGER NOT NULL DEFAULT 3,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (referrer_id) REFERENCES users(telegram_id),
      FOREIGN KEY (referred_id) REFERENCES users(telegram_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred
      ON referrals(referred_id);
  `);

  return _db;
}

// ── Users ───────────────────────────────────────────

export interface DbUser {
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  selected_agent_id: string;
  plan: string;
  messages_today: number;
  messages_date: string;
  created_at: number;
  updated_at: number;
}

export function upsertUser(
  telegramId: number,
  firstName: string,
  lastName?: string,
  username?: string,
  languageCode?: string,
): DbUser {
  const db = getDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO users (telegram_id, first_name, last_name, username, language_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      username = excluded.username,
      language_code = excluded.language_code,
      updated_at = ?
  `).run(telegramId, firstName, lastName || null, username || null, languageCode || null, now, now, now);

  return db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(telegramId) as DbUser;
}

export function getUser(telegramId: number): DbUser | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(telegramId) as DbUser) || null;
}

export function updateSelectedAgent(telegramId: number, agentId: string): void {
  const db = getDb();
  db.prepare("UPDATE users SET selected_agent_id = ?, updated_at = ? WHERE telegram_id = ?")
    .run(agentId, Date.now(), telegramId);
}

export function updateUserPlan(telegramId: number, plan: string): void {
  const db = getDb();
  db.prepare("UPDATE users SET plan = ?, updated_at = ? WHERE telegram_id = ?")
    .run(plan, Date.now(), telegramId);
}

// ── Usage Limits ────────────────────────────────────

const FREE_DAILY_LIMIT = 30;

export function checkAndIncrementUsage(
  telegramId: number,
): { allowed: boolean; used: number; limit: number; plan: string } {
  const db = getDb();
  const user = getUser(telegramId);
  if (!user) return { allowed: false, used: 0, limit: 0, plan: "free" };

  if (user.plan === "pro" || user.plan === "team") {
    return { allowed: true, used: user.messages_today, limit: -1, plan: user.plan };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Atomic: reset if new day AND increment, only if under limit
  // This prevents race conditions with concurrent requests
  const result = db.prepare(`
    UPDATE users SET
      messages_today = CASE WHEN messages_date = ? THEN messages_today + 1 ELSE 1 END,
      messages_date = ?
    WHERE telegram_id = ? AND (
      messages_date != ? OR messages_today < ?
    )
  `).run(today, today, telegramId, today, FREE_DAILY_LIMIT);

  if (result.changes === 0) {
    // Limit exceeded — no update happened
    return { allowed: false, used: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT, plan: "free" };
  }

  // Re-read to get actual count
  const updated = getUser(telegramId);
  return {
    allowed: true,
    used: updated?.messages_today ?? 1,
    limit: FREE_DAILY_LIMIT,
    plan: "free",
  };
}

// ── Conversations ───────────────────────────────────

export interface DbConversation {
  id: string;
  telegram_id: number;
  agent_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export function getConversationById(conversationId: string): DbConversation | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as DbConversation | undefined;
  return row || null;
}

export function getConversation(telegramId: number, agentId: string): DbConversation | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM conversations WHERE telegram_id = ? AND agent_id = ? ORDER BY updated_at DESC LIMIT 1",
  ).get(telegramId, agentId) as DbConversation | undefined;
  return row || null;
}

export function getOrCreateConversation(telegramId: number, agentId: string): DbConversation {
  const db = getDb();

  const existing = db.prepare(
    "SELECT * FROM conversations WHERE telegram_id = ? AND agent_id = ? ORDER BY updated_at DESC LIMIT 1",
  ).get(telegramId, agentId) as DbConversation | undefined;

  if (existing) return existing;

  const now = Date.now();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO conversations (id, telegram_id, agent_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, telegramId, agentId, "", now, now);

  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as DbConversation;
}

export function createNewConversation(telegramId: number, agentId: string): DbConversation {
  const db = getDb();
  const now = Date.now();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO conversations (id, telegram_id, agent_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, telegramId, agentId, "", now, now);

  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as DbConversation;
}

export function listConversations(telegramId: number): DbConversation[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM conversations WHERE telegram_id = ? ORDER BY updated_at DESC LIMIT 50",
  ).all(telegramId) as DbConversation[];
}

// ── Messages ────────────────────────────────────────

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: number;
}

export function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
): DbMessage {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();

  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, conversationId, role, content, now);

  db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);

  const conv = db.prepare("SELECT title FROM conversations WHERE id = ?").get(conversationId) as { title: string };
  if (!conv.title && role === "user") {
    const title = content.slice(0, 80) + (content.length > 80 ? "..." : "");
    db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, conversationId);
  }

  return { id, conversation_id: conversationId, role, content, created_at: now };
}

export function getMessages(conversationId: string, limit = 20): DbMessage[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
  ).all(conversationId, limit) as DbMessage[];
  return rows.reverse();
}

// ── Referrals ───────────────────────────────────────

const REFERRAL_REWARD_DAYS = 3;

export interface DbReferral {
  id: string;
  referrer_id: number;
  referred_id: number;
  reward_days: number;
  created_at: number;
}

/**
 * Process a referral. Returns null if already referred or self-referral.
 */
export function processReferral(
  referrerId: number,
  referredId: number,
): { referrer: DbUser; referred: DbUser; rewardDays: number } | null {
  const db = getDb();

  // No self-referral
  if (referrerId === referredId) return null;

  // Check if already referred
  const existing = db.prepare(
    "SELECT id FROM referrals WHERE referred_id = ?",
  ).get(referredId);
  if (existing) return null;

  // Check both users exist
  const referrer = getUser(referrerId);
  const referred = getUser(referredId);
  if (!referrer || !referred) return null;

  const now = Date.now();
  const proExpiry = now + REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000;

  // Save referral
  db.prepare(
    "INSERT INTO referrals (id, referrer_id, referred_id, reward_days, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), referrerId, referredId, REFERRAL_REWARD_DAYS, now);

  // Upgrade both to pro (if they're on free)
  if (referrer.plan === "free") {
    db.prepare("UPDATE users SET plan = 'pro', updated_at = ? WHERE telegram_id = ?")
      .run(now, referrerId);
  }
  if (referred.plan === "free") {
    db.prepare("UPDATE users SET plan = 'pro', updated_at = ? WHERE telegram_id = ?")
      .run(now, referredId);
  }

  return {
    referrer: getUser(referrerId)!,
    referred: getUser(referredId)!,
    rewardDays: REFERRAL_REWARD_DAYS,
  };
}

/**
 * Get referral stats for a user.
 */
export function getReferralStats(telegramId: number): { count: number; totalRewardDays: number } {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(reward_days), 0) as total_days FROM referrals WHERE referrer_id = ?",
  ).get(telegramId) as { count: number; total_days: number };
  return { count: row.count, totalRewardDays: row.total_days };
}
