import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { isPlanActive, type DbUser } from "../db.js";

// ── isPlanActive (pure helper) ────────────────────────────

describe("isPlanActive", () => {
  const baseUser = {
    telegram_id: 1,
    first_name: "T",
    last_name: null,
    username: null,
    language_code: null,
    selected_agent_id: "coding",
    messages_today: 0,
    messages_date: "",
    created_at: 0,
    updated_at: 0,
  };

  it("returns false for free users regardless of expiry", () => {
    expect(isPlanActive({ plan: "free", plan_expires_at: null })).toBe(false);
    expect(isPlanActive({ plan: "free", plan_expires_at: Date.now() + 1e10 })).toBe(false);
  });

  it("returns true for pro users with null expiry (permanent)", () => {
    expect(isPlanActive({ plan: "pro", plan_expires_at: null })).toBe(true);
  });

  it("returns true for team users with null expiry (permanent)", () => {
    expect(isPlanActive({ plan: "team", plan_expires_at: null })).toBe(true);
  });

  it("returns true for pro users with a future expiry", () => {
    const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(isPlanActive({ plan: "pro", plan_expires_at: future })).toBe(true);
  });

  it("returns false for pro users with a past expiry", () => {
    const past = Date.now() - 1;
    expect(isPlanActive({ plan: "pro", plan_expires_at: past })).toBe(false);
  });

  it("respects an injected 'now' clock for deterministic testing", () => {
    const user: Pick<DbUser, "plan" | "plan_expires_at"> = { plan: "pro", plan_expires_at: 1000 };
    expect(isPlanActive(user, 500)).toBe(true);
    expect(isPlanActive(user, 1000)).toBe(false);
    expect(isPlanActive(user, 1500)).toBe(false);
  });

  it("treats any non-pro/non-team plan as inactive", () => {
    expect(isPlanActive({ plan: "enterprise" as string, plan_expires_at: null })).toBe(false);
  });

  it("is compatible with the full DbUser shape", () => {
    const full: DbUser = { ...baseUser, plan: "pro", plan_expires_at: null };
    expect(isPlanActive(full)).toBe(true);
  });
});

// ── Schema migration: ALTER TABLE adds plan_expires_at ─────

describe("schema migration: plan_expires_at", () => {
  function createLegacyDb(): Database.Database {
    const db = new Database(":memory:");
    // Create the legacy schema (no plan_expires_at column)
    db.prepare(`CREATE TABLE users (
      telegram_id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      messages_today INTEGER NOT NULL DEFAULT 0,
      messages_date TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`).run();
    db.prepare(
      "INSERT INTO users (telegram_id, first_name, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run(1, "Alice", "pro", Date.now(), Date.now());
    return db;
  }

  function runMigration(db: Database.Database): void {
    const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "plan_expires_at")) {
      db.prepare("ALTER TABLE users ADD COLUMN plan_expires_at INTEGER").run();
    }
  }

  it("adds plan_expires_at column when missing", () => {
    const db = createLegacyDb();
    const before = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    expect(before.some((c) => c.name === "plan_expires_at")).toBe(false);

    runMigration(db);

    const after = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    expect(after.some((c) => c.name === "plan_expires_at")).toBe(true);
  });

  it("preserves existing user data after migration", () => {
    const db = createLegacyDb();
    runMigration(db);

    const row = db.prepare("SELECT * FROM users WHERE telegram_id = 1").get() as {
      first_name: string;
      plan: string;
      plan_expires_at: number | null;
    };
    expect(row.first_name).toBe("Alice");
    expect(row.plan).toBe("pro");
    expect(row.plan_expires_at).toBeNull();
  });

  it("is idempotent: running twice is a no-op", () => {
    const db = createLegacyDb();
    runMigration(db);
    expect(() => runMigration(db)).not.toThrow();
    const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const expiryCols = cols.filter((c) => c.name === "plan_expires_at");
    expect(expiryCols.length).toBe(1);
  });
});
