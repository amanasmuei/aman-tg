import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

// ── In-memory DB setup ──────────────────────────────────────────────────────

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
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

  return db;
}

// ── Local interfaces ─────────────────────────────────────────────────────────

interface DbMerchant {
  id: string;
  name: string;
  description: string;
  type: string;
  subcategory: string;
  address: string;
  phone: string;
  operating_hours: string;
  is_active: number;
  notes: string;
  created_at: number;
  updated_at: number;
}

interface DbServiceItem {
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

interface DbOrder {
  id: string;
  short_id: string;
  telegram_id: number;
  merchant_id: string;
  conversation_id: string | null;
  type: string;
  items: string;
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

// ── Seed helpers ─────────────────────────────────────────────────────────────

function insertUser(db: Database.Database, telegramId: number, firstName = "Test") {
  const now = Date.now();
  db.prepare(
    "INSERT OR IGNORE INTO users (telegram_id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
  ).run(telegramId, firstName, now, now);
}

function insertMerchant(
  db: Database.Database,
  overrides: Partial<DbMerchant> & { id: string; name: string; type: string },
): DbMerchant {
  const now = Date.now();
  const row = {
    id: overrides.id,
    name: overrides.name,
    description: overrides.description ?? "",
    type: overrides.type,
    subcategory: overrides.subcategory ?? "",
    address: overrides.address ?? "123 Jalan Test",
    phone: overrides.phone ?? "0123456789",
    operating_hours: overrides.operating_hours ?? "{}",
    is_active: overrides.is_active ?? 1,
    notes: overrides.notes ?? "",
    created_at: now,
    updated_at: now,
  };
  db.prepare(`
    INSERT INTO merchants (id, name, description, type, subcategory, address, phone, operating_hours, is_active, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.id, row.name, row.description, row.type, row.subcategory,
    row.address, row.phone, row.operating_hours, row.is_active,
    row.notes, row.created_at, row.updated_at,
  );
  return db.prepare("SELECT * FROM merchants WHERE id = ?").get(row.id) as DbMerchant;
}

function insertServiceItem(
  db: Database.Database,
  overrides: Partial<DbServiceItem> & { id: string; merchant_id: string; name: string; price: number },
): DbServiceItem {
  const now = Date.now();
  const row = {
    id: overrides.id,
    merchant_id: overrides.merchant_id,
    name: overrides.name,
    description: overrides.description ?? "",
    price: overrides.price,
    category: overrides.category ?? "main",
    is_available: overrides.is_available ?? 1,
    popular: overrides.popular ?? 0,
    image_url: overrides.image_url ?? null,
    created_at: now,
    updated_at: now,
  };
  db.prepare(`
    INSERT INTO service_items (id, merchant_id, name, description, price, category, is_available, popular, image_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.id, row.merchant_id, row.name, row.description, row.price,
    row.category, row.is_available, row.popular, row.image_url,
    row.created_at, row.updated_at,
  );
  return db.prepare("SELECT * FROM service_items WHERE id = ?").get(row.id) as DbServiceItem;
}

function insertOrder(
  db: Database.Database,
  overrides: Partial<DbOrder> & { telegram_id: number; merchant_id: string },
): DbOrder {
  const now = Date.now();
  const id = overrides.id ?? randomUUID();
  const shortId = overrides.short_id
    ?? Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0").toUpperCase();
  db.prepare(`
    INSERT INTO orders (id, short_id, telegram_id, merchant_id, conversation_id, type, items, total, notes, status, scheduled_at, pickup_time, payment_method, payment_status, status_updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    shortId,
    overrides.telegram_id,
    overrides.merchant_id,
    overrides.conversation_id ?? null,
    overrides.type ?? "food_order",
    overrides.items ?? "[]",
    overrides.total ?? 0,
    overrides.notes ?? "",
    overrides.status ?? "pending",
    overrides.scheduled_at ?? null,
    overrides.pickup_time ?? null,
    overrides.payment_method ?? null,
    overrides.payment_status ?? null,
    now,
    overrides.created_at ?? now,
  );
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as DbOrder;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Merchants", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it("lists only active merchants", () => {
    insertMerchant(db, { id: "m1", name: "Nasi Lemak Wangi", type: "food", is_active: 1 });
    insertMerchant(db, { id: "m2", name: "Tutup Kedai", type: "food", is_active: 0 });

    const active = db.prepare("SELECT * FROM merchants WHERE is_active = 1").all() as DbMerchant[];
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("m1");
  });

  it("filters active merchants by type", () => {
    insertMerchant(db, { id: "m1", name: "Mee Goreng House", type: "food" });
    insertMerchant(db, { id: "m2", name: "Kedai Dobi", type: "laundry" });
    insertMerchant(db, { id: "m3", name: "Roti Canai Stall", type: "food" });

    const food = db.prepare(
      "SELECT * FROM merchants WHERE is_active = 1 AND type = ? ORDER BY name",
    ).all("food") as DbMerchant[];
    expect(food).toHaveLength(2);
    expect(food.map((m) => m.id).sort()).toEqual(["m1", "m3"].sort());
  });

  it("upserts merchant — updates name without changing created_at", () => {
    const now = Date.now();
    insertMerchant(db, { id: "m1", name: "Original Name", type: "food" });
    const original = db.prepare("SELECT * FROM merchants WHERE id = ?").get("m1") as DbMerchant;

    db.prepare(`
      INSERT INTO merchants (id, name, description, type, subcategory, address, phone, operating_hours, is_active, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = ?
    `).run("m1", "New Name", "", "food", "", "", "", "{}", 1, "", now, now + 100, now + 100);

    const updated = db.prepare("SELECT * FROM merchants WHERE id = ?").get("m1") as DbMerchant;
    expect(updated.name).toBe("New Name");
    expect(updated.created_at).toBe(original.created_at);
  });
});

describe("Service Items", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    insertMerchant(db, { id: "m1", name: "Kedai Makan", type: "food" });
  });

  it("returns only available items for a merchant", () => {
    insertServiceItem(db, { id: "i1", merchant_id: "m1", name: "Nasi Goreng", price: 8.0, is_available: 1 });
    insertServiceItem(db, { id: "i2", merchant_id: "m1", name: "Sold Out Item", price: 5.0, is_available: 0 });

    const items = db.prepare(
      "SELECT * FROM service_items WHERE merchant_id = ? AND is_available = 1 ORDER BY popular DESC, name",
    ).all("m1") as DbServiceItem[];

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("i1");
  });

  it("returns popular items before regular items", () => {
    insertServiceItem(db, { id: "i1", merchant_id: "m1", name: "Regular Item", price: 5.0, popular: 0 });
    insertServiceItem(db, { id: "i2", merchant_id: "m1", name: "Popular Item", price: 10.0, popular: 1 });
    insertServiceItem(db, { id: "i3", merchant_id: "m1", name: "Another Regular", price: 6.0, popular: 0 });

    const items = db.prepare(
      "SELECT * FROM service_items WHERE merchant_id = ? AND is_available = 1 ORDER BY popular DESC, name",
    ).all("m1") as DbServiceItem[];

    expect(items[0].id).toBe("i2");
  });

  it("does not return items from other merchants", () => {
    insertMerchant(db, { id: "m2", name: "Other Kedai", type: "food" });
    insertServiceItem(db, { id: "i1", merchant_id: "m1", name: "M1 Item", price: 5.0 });
    insertServiceItem(db, { id: "i2", merchant_id: "m2", name: "M2 Item", price: 6.0 });

    const items = db.prepare(
      "SELECT * FROM service_items WHERE merchant_id = ? AND is_available = 1",
    ).all("m1") as DbServiceItem[];

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("i1");
  });
});

describe("Orders", () => {
  let db: Database.Database;
  const USER_ID = 111111;

  beforeEach(() => {
    db = createTestDb();
    insertUser(db, USER_ID, "Ali");
    insertMerchant(db, {
      id: "m1",
      name: "Kedai Makan",
      type: "food",
      address: "Jalan Utama",
      phone: "0111111111",
    });
  });

  it("creates an order with the given short_id", () => {
    const order = insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "AB12" });

    expect(order.short_id).toBe("AB12");
    expect(order.telegram_id).toBe(USER_ID);
    expect(order.merchant_id).toBe("m1");
    expect(order.status).toBe("pending");
  });

  it("short_id is unique — duplicate insertion throws", () => {
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "DUPE" });

    expect(() => {
      insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "DUPE" });
    }).toThrow();
  });

  it("updates order status", () => {
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "UPDT" });

    db.prepare("UPDATE orders SET status = ?, status_updated_at = ? WHERE short_id = ?")
      .run("confirmed", Date.now(), "UPDT");

    const updated = db.prepare("SELECT * FROM orders WHERE short_id = ?").get("UPDT") as DbOrder;
    expect(updated.status).toBe("confirmed");
  });

  it("returns active orders for a user, excludes done and cancelled", () => {
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "ORD1", status: "pending" });
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "ORD2", status: "confirmed" });
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "ORD3", status: "done" });
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "ORD4", status: "cancelled" });

    const active = db.prepare(`
      SELECT o.*, m.name as merchant_name
      FROM orders o
      JOIN merchants m ON m.id = o.merchant_id
      WHERE o.telegram_id = ? AND o.status NOT IN ('done', 'cancelled')
      ORDER BY o.created_at DESC
    `).all(USER_ID) as (DbOrder & { merchant_name: string })[];

    expect(active).toHaveLength(2);
    expect(active.map((o) => o.short_id).sort()).toEqual(["ORD1", "ORD2"].sort());
  });

  it("finds an order by short_id and joins merchant details", () => {
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "FIND" });

    const found = db.prepare(`
      SELECT o.*, m.name as merchant_name, m.address as merchant_address, m.phone as merchant_phone
      FROM orders o
      JOIN merchants m ON m.id = o.merchant_id
      WHERE o.short_id = ?
    `).get("FIND") as (DbOrder & { merchant_name: string; merchant_address: string; merchant_phone: string }) | undefined;

    expect(found).toBeDefined();
    expect(found!.merchant_name).toBe("Kedai Makan");
    expect(found!.merchant_address).toBe("Jalan Utama");
    expect(found!.merchant_phone).toBe("0111111111");
  });

  it("stores items as JSON and calculates correct total", () => {
    const items = [
      { item_id: "i1", name: "Nasi Goreng", qty: 2, price: 8.0 },
      { item_id: "i2", name: "Teh Tarik", qty: 1, price: 3.0 },
    ];
    const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

    insertOrder(db, {
      telegram_id: USER_ID,
      merchant_id: "m1",
      short_id: "TOTL",
      items: JSON.stringify(items),
      total,
    });

    const order = db.prepare("SELECT * FROM orders WHERE short_id = ?").get("TOTL") as DbOrder;
    expect(order.total).toBe(19.0);
    expect(JSON.parse(order.items)).toHaveLength(2);
  });

  it("does not return another user's orders as active", () => {
    insertUser(db, 222222, "Bob");
    insertOrder(db, { telegram_id: 222222, merchant_id: "m1", short_id: "BOB1", status: "pending" });
    insertOrder(db, { telegram_id: USER_ID, merchant_id: "m1", short_id: "ALI1", status: "pending" });

    const active = db.prepare(
      "SELECT * FROM orders WHERE telegram_id = ? AND status NOT IN ('done', 'cancelled')",
    ).all(USER_ID) as DbOrder[];

    expect(active).toHaveLength(1);
    expect(active[0].short_id).toBe("ALI1");
  });
});
