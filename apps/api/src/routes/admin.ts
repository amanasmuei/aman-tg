import { Hono } from "hono";
import { getDb } from "../db.js";

const app = new Hono();

// GET /admin/stats — dashboard analytics
app.get("/stats", (c) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && c.req.header("x-admin-token") !== adminToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Total users
  const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;

  // Active today (users who sent messages today)
  const dau = (db.prepare("SELECT COUNT(*) as count FROM users WHERE messages_date = ?").get(today) as { count: number }).count;

  // Messages today
  const messagesToday = (db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE created_at > ?",
  ).get(oneDayAgo) as { count: number }).count;

  // Messages this week
  const messagesWeek = (db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE created_at > ?",
  ).get(sevenDaysAgo) as { count: number }).count;

  // Total conversations
  const totalConversations = (db.prepare("SELECT COUNT(*) as count FROM conversations").get() as { count: number }).count;

  // Total messages
  const totalMessages = (db.prepare("SELECT COUNT(*) as count FROM messages").get() as { count: number }).count;

  // Pro users
  const proUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").get() as { count: number }).count;

  // Popular agents (by conversation count)
  const popularAgents = db.prepare(
    "SELECT agent_id, COUNT(*) as count FROM conversations GROUP BY agent_id ORDER BY count DESC LIMIT 10",
  ).all() as Array<{ agent_id: string; count: number }>;

  // New users today
  const newUsersToday = (db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE created_at > ?",
  ).get(oneDayAgo) as { count: number }).count;

  return c.json({
    users: {
      total: totalUsers,
      dau,
      newToday: newUsersToday,
      pro: proUsers,
    },
    messages: {
      today: messagesToday,
      week: messagesWeek,
      total: totalMessages,
    },
    conversations: totalConversations,
    popularAgents,
    generatedAt: new Date().toISOString(),
  });
});

export default app;
