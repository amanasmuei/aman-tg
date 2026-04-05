import { Hono } from "hono";
import { getOrder, getOrderById, getActiveOrders, updateOrderStatus } from "../db.js";
import { pendingNotifications } from "../tools.js";

const app = new Hono();

// GET /active — user's active orders
app.get("/active", (c) => {
  const telegramId = Number(c.req.query("telegramId"));
  if (!telegramId) return c.json({ error: "telegramId required" }, 400);
  const orders = getActiveOrders(telegramId);
  return c.json({ orders });
});

// GET /pending-notifications — bot polls this (admin only)
// IMPORTANT: this route must come before /:id to avoid "pending-notifications" being parsed as an ID
app.get("/pending-notifications", (c) => {
  const adminToken = c.req.header("x-admin-token");
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const notifications = pendingNotifications.splice(0);
  return c.json({ notifications });
});

// GET /:id — order by UUID or short_id
app.get("/:id", (c) => {
  const id = c.req.param("id");
  const order = id.length <= 8 ? getOrder(id) : getOrderById(id);
  if (!order) return c.json({ error: "Order not found" }, 404);
  return c.json({ order });
});

// PATCH /:id/status — update status (admin only)
app.patch("/:id/status", async (c) => {
  const adminToken = c.req.header("x-admin-token");
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const shortId = c.req.param("id");
  const { status, scheduled_at } = await c.req.json<{ status: string; scheduled_at?: number }>();
  const validStatuses = ["confirmed", "preparing", "ready", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return c.json({ error: `Invalid status. Must be: ${validStatuses.join(", ")}` }, 400);
  }
  const order = updateOrderStatus(shortId, status, scheduled_at);
  if (!order) return c.json({ error: "Order not found" }, 404);
  return c.json({ success: true, short_id: order.short_id, status: order.status, telegram_id: order.telegram_id });
});

export default app;
