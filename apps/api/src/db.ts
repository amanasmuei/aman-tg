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

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
    );

    CREATE INDEX IF NOT EXISTS idx_todos_user_status
      ON todos(telegram_id, status);

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      subcategory TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      operating_hours TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_items (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'main',
      is_available INTEGER NOT NULL DEFAULT 1,
      popular INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      short_id TEXT NOT NULL UNIQUE,
      telegram_id INTEGER NOT NULL,
      merchant_id TEXT NOT NULL,
      conversation_id TEXT,
      type TEXT NOT NULL DEFAULT 'food_order',
      items TEXT NOT NULL DEFAULT '[]',
      total REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_at INTEGER,
      pickup_time INTEGER,
      payment_method TEXT,
      payment_status TEXT,
      status_updated_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (telegram_id) REFERENCES users(telegram_id),
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(telegram_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_merchant_status ON orders(merchant_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
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

export function getConversationById(conversationId: string, telegramId?: number): DbConversation | null {
  const db = getDb();
  // Always filter by telegram_id when provided to prevent cross-user access
  if (telegramId) {
    const row = db.prepare("SELECT * FROM conversations WHERE id = ? AND telegram_id = ?").get(conversationId, telegramId) as DbConversation | undefined;
    return row || null;
  }
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

// ── Todos ──────────────────────────────────────────

export interface DbTodo {
  id: string;
  telegram_id: number;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  due_date: string | null;
  status: "pending" | "done";
  created_at: number;
  updated_at: number;
}

export function addTodo(
  telegramId: number,
  title: string,
  description = "",
  priority: "high" | "medium" | "low" = "medium",
  dueDate?: string,
): DbTodo {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO todos (id, telegram_id, title, description, priority, due_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)",
  ).run(id, telegramId, title, description, priority, dueDate || null, now, now);
  return db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as DbTodo;
}

export function listTodos(
  telegramId: number,
  status?: "pending" | "done" | "all",
): DbTodo[] {
  const db = getDb();
  if (status === "all") {
    return db.prepare(
      "SELECT * FROM todos WHERE telegram_id = ? ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC LIMIT 50",
    ).all(telegramId) as DbTodo[];
  }
  const filterStatus = status || "pending";
  return db.prepare(
    "SELECT * FROM todos WHERE telegram_id = ? AND status = ? ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC LIMIT 50",
  ).all(telegramId, filterStatus) as DbTodo[];
}

export function completeTodo(telegramId: number, todoId: string): DbTodo | null {
  const db = getDb();
  const result = db.prepare(
    "UPDATE todos SET status = 'done', updated_at = ? WHERE id = ? AND telegram_id = ?",
  ).run(Date.now(), todoId, telegramId);
  if (result.changes === 0) return null;
  return db.prepare("SELECT * FROM todos WHERE id = ?").get(todoId) as DbTodo;
}

export function updateTodo(
  telegramId: number,
  todoId: string,
  updates: { title?: string; description?: string; priority?: string; due_date?: string; status?: string },
): DbTodo | null {
  const db = getDb();
  const todo = db.prepare("SELECT * FROM todos WHERE id = ? AND telegram_id = ?").get(todoId, telegramId) as DbTodo | undefined;
  if (!todo) return null;

  const now = Date.now();
  if (updates.title) db.prepare("UPDATE todos SET title = ?, updated_at = ? WHERE id = ?").run(updates.title, now, todoId);
  if (updates.description) db.prepare("UPDATE todos SET description = ?, updated_at = ? WHERE id = ?").run(updates.description, now, todoId);
  if (updates.priority) db.prepare("UPDATE todos SET priority = ?, updated_at = ? WHERE id = ?").run(updates.priority, now, todoId);
  if (updates.due_date) db.prepare("UPDATE todos SET due_date = ?, updated_at = ? WHERE id = ?").run(updates.due_date, now, todoId);
  if (updates.status) db.prepare("UPDATE todos SET status = ?, updated_at = ? WHERE id = ?").run(updates.status, now, todoId);

  return db.prepare("SELECT * FROM todos WHERE id = ?").get(todoId) as DbTodo;
}

export function deleteTodo(telegramId: number, todoId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM todos WHERE id = ? AND telegram_id = ?").run(todoId, telegramId);
  return result.changes > 0;
}

// ── Merchants ──────────────────────────────────────

export interface DbMerchant {
  id: string;
  name: string;
  description: string;
  type: string;
  subcategory: string;
  address: string;
  phone: string;
  operating_hours: string; // JSON
  is_active: number;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface DbServiceItem {
  id: string;
  merchant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: number;
  popular: number;
  image_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface DbOrder {
  id: string;
  short_id: string;
  telegram_id: number;
  merchant_id: string;
  conversation_id: string | null;
  type: string;
  items: string; // JSON
  total: number;
  notes: string;
  status: string;
  scheduled_at: number | null;
  pickup_time: number | null;
  payment_method: string | null;
  payment_status: string | null;
  status_updated_at: number;
  created_at: number;
}

export function getMerchants(type?: string): DbMerchant[] {
  const db = getDb();
  if (type) {
    return db.prepare(
      "SELECT * FROM merchants WHERE is_active = 1 AND type = ? ORDER BY name",
    ).all(type) as DbMerchant[];
  }
  return db.prepare(
    "SELECT * FROM merchants WHERE is_active = 1 ORDER BY name",
  ).all() as DbMerchant[];
}

export function getMerchant(id: string): DbMerchant | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM merchants WHERE id = ?").get(id) as DbMerchant | undefined;
}

export function upsertMerchant(
  merchant: Omit<DbMerchant, "created_at" | "updated_at">,
): DbMerchant {
  const db = getDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO merchants (id, name, description, type, subcategory, address, phone, operating_hours, is_active, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      type = excluded.type,
      subcategory = excluded.subcategory,
      address = excluded.address,
      phone = excluded.phone,
      operating_hours = excluded.operating_hours,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = ?
  `).run(
    merchant.id,
    merchant.name,
    merchant.description,
    merchant.type,
    merchant.subcategory,
    merchant.address,
    merchant.phone,
    merchant.operating_hours,
    merchant.is_active,
    merchant.notes,
    now,
    now,
    now,
  );

  return db.prepare("SELECT * FROM merchants WHERE id = ?").get(merchant.id) as DbMerchant;
}

export function getServiceItems(merchantId: string): DbServiceItem[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM service_items WHERE merchant_id = ? AND is_available = 1 ORDER BY popular DESC, name",
  ).all(merchantId) as DbServiceItem[];
}

export function getServiceItem(id: string): DbServiceItem | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM service_items WHERE id = ?").get(id) as DbServiceItem | undefined;
}

export function searchServiceItems(
  search: string,
): (DbServiceItem & { merchant_name: string })[] {
  const db = getDb();
  const term = `%${search}%`;
  return db.prepare(`
    SELECT si.*, m.name as merchant_name
    FROM service_items si
    JOIN merchants m ON m.id = si.merchant_id
    WHERE si.is_available = 1 AND m.is_active = 1
      AND (si.name LIKE ? OR si.description LIKE ?)
    ORDER BY si.popular DESC, si.name
  `).all(term, term) as (DbServiceItem & { merchant_name: string })[];
}

export function upsertServiceItem(
  item: Omit<DbServiceItem, "created_at" | "updated_at">,
): DbServiceItem {
  const db = getDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO service_items (id, merchant_id, name, description, price, category, is_available, popular, image_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      merchant_id = excluded.merchant_id,
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      category = excluded.category,
      is_available = excluded.is_available,
      popular = excluded.popular,
      image_url = excluded.image_url,
      updated_at = ?
  `).run(
    item.id,
    item.merchant_id,
    item.name,
    item.description,
    item.price,
    item.category,
    item.is_available,
    item.popular,
    item.image_url ?? null,
    now,
    now,
    now,
  );

  return db.prepare("SELECT * FROM service_items WHERE id = ?").get(item.id) as DbServiceItem;
}

export function updateItemAvailability(itemId: string, isAvailable: boolean): void {
  const db = getDb();
  db.prepare("UPDATE service_items SET is_available = ?, updated_at = ? WHERE id = ?")
    .run(isAvailable ? 1 : 0, Date.now(), itemId);
}

export function getAllMerchants(): (DbMerchant & { item_count: number })[] {
  const db = getDb();
  return db.prepare(`
    SELECT m.*, COUNT(si.id) as item_count
    FROM merchants m
    LEFT JOIN service_items si ON si.merchant_id = m.id
    GROUP BY m.id
    ORDER BY m.name
  `).all() as (DbMerchant & { item_count: number })[];
}

export function getAllServiceItems(merchantId: string): DbServiceItem[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM service_items WHERE merchant_id = ? ORDER BY popular DESC, name",
  ).all(merchantId) as DbServiceItem[];
}

export function setMerchantActive(id: string, isActive: boolean): void {
  const db = getDb();
  db.prepare("UPDATE merchants SET is_active = ?, updated_at = ? WHERE id = ?")
    .run(isActive ? 1 : 0, Date.now(), id);
}

export function deleteMerchantCascade(id: string): void {
  const db = getDb();
  const deleteItems = db.prepare("DELETE FROM service_items WHERE merchant_id = ?");
  const deleteMerchant = db.prepare("DELETE FROM merchants WHERE id = ?");
  const run = db.transaction(() => {
    deleteItems.run(id);
    deleteMerchant.run(id);
  });
  run();
}

// ── Orders ──────────────────────────────────────────

export function generateShortId(): string {
  const db = getDb();
  for (let i = 0; i < 3; i++) {
    const candidate = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0").toUpperCase();
    const existing = db.prepare("SELECT 1 FROM orders WHERE short_id = ?").get(candidate);
    if (!existing) return candidate;
  }
  // Fallback to 6-char
  return Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0").toUpperCase();
}

export function createOrder(params: {
  telegramId: number;
  merchantId: string;
  conversationId?: string;
  type: string;
  items: { item_id: string; name: string; qty: number; price: number }[];
  notes?: string;
  pickupTime?: number;
}): DbOrder {
  const db = getDb();
  const id = randomUUID();
  const shortId = generateShortId();
  const now = Date.now();
  const total = params.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const itemsJson = JSON.stringify(params.items);

  db.prepare(`
    INSERT INTO orders (id, short_id, telegram_id, merchant_id, conversation_id, type, items, total, notes, status, pickup_time, status_updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(
    id,
    shortId,
    params.telegramId,
    params.merchantId,
    params.conversationId ?? null,
    params.type,
    itemsJson,
    total,
    params.notes ?? "",
    params.pickupTime ?? null,
    now,
    now,
  );

  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as DbOrder;
}

export function getOrder(
  shortId: string,
): (DbOrder & { merchant_name: string; merchant_address: string; merchant_phone: string }) | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT o.*, m.name as merchant_name, m.address as merchant_address, m.phone as merchant_phone
    FROM orders o
    JOIN merchants m ON m.id = o.merchant_id
    WHERE o.short_id = ?
  `).get(shortId) as (DbOrder & { merchant_name: string; merchant_address: string; merchant_phone: string }) | undefined;
}

export function getOrderById(
  id: string,
): (DbOrder & { merchant_name: string; merchant_address: string }) | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT o.*, m.name as merchant_name, m.address as merchant_address
    FROM orders o
    JOIN merchants m ON m.id = o.merchant_id
    WHERE o.id = ?
  `).get(id) as (DbOrder & { merchant_name: string; merchant_address: string }) | undefined;
}

export function getActiveOrders(telegramId: number): (DbOrder & { merchant_name: string })[] {
  const db = getDb();
  return db.prepare(`
    SELECT o.*, m.name as merchant_name
    FROM orders o
    JOIN merchants m ON m.id = o.merchant_id
    WHERE o.telegram_id = ? AND o.status NOT IN ('done', 'cancelled')
    ORDER BY o.created_at DESC
  `).all(telegramId) as (DbOrder & { merchant_name: string })[];
}

export function getLatestActiveOrder(
  telegramId: number,
): (DbOrder & { merchant_name: string; merchant_address: string }) | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT o.*, m.name as merchant_name, m.address as merchant_address
    FROM orders o
    JOIN merchants m ON m.id = o.merchant_id
    WHERE o.telegram_id = ? AND o.status NOT IN ('done', 'cancelled')
    ORDER BY o.created_at DESC
    LIMIT 1
  `).get(telegramId) as (DbOrder & { merchant_name: string; merchant_address: string }) | undefined;
}

export function updateOrderStatus(
  shortId: string,
  status: string,
  scheduledAt?: number,
): DbOrder | undefined {
  const db = getDb();
  const now = Date.now();

  if (scheduledAt !== undefined) {
    db.prepare(
      "UPDATE orders SET status = ?, scheduled_at = ?, status_updated_at = ? WHERE short_id = ?",
    ).run(status, scheduledAt, now, shortId);
  } else {
    db.prepare(
      "UPDATE orders SET status = ?, status_updated_at = ? WHERE short_id = ?",
    ).run(status, now, shortId);
  }

  return db.prepare("SELECT * FROM orders WHERE short_id = ?").get(shortId) as DbOrder | undefined;
}

export function getTodayOrders(): (DbOrder & { merchant_name: string; user_name: string })[] {
  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();

  return db.prepare(`
    SELECT o.*, m.name as merchant_name, u.first_name as user_name
    FROM orders o
    JOIN merchants m ON m.id = o.merchant_id
    JOIN users u ON u.telegram_id = o.telegram_id
    WHERE o.created_at >= ? AND o.status NOT IN ('done', 'cancelled')
    ORDER BY o.created_at DESC
  `).all(startMs) as (DbOrder & { merchant_name: string; user_name: string })[];
}

// ── Data Reset ─────────────────────────────────────

export function resetUserData(telegramId: number): {
  conversations: number;
  messages: number;
  todos: number;
} {
  const db = getDb();

  // Delete messages first (FK to conversations)
  const msgResult = db.prepare(`
    DELETE FROM messages WHERE conversation_id IN (
      SELECT id FROM conversations WHERE telegram_id = ?
    )
  `).run(telegramId);

  // Delete conversations
  const convResult = db.prepare(
    "DELETE FROM conversations WHERE telegram_id = ?",
  ).run(telegramId);

  // Delete todos
  const todoResult = db.prepare(
    "DELETE FROM todos WHERE telegram_id = ?",
  ).run(telegramId);

  // Reset usage counters (keep the user account)
  db.prepare(
    "UPDATE users SET messages_today = 0, messages_date = '', selected_agent_id = 'coding', updated_at = ? WHERE telegram_id = ?",
  ).run(Date.now(), telegramId);

  return {
    conversations: convResult.changes,
    messages: msgResult.changes,
    todos: todoResult.changes,
  };
}
