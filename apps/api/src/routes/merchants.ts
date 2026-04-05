import { Hono } from "hono";
import { getMerchants, getMerchant, getServiceItems } from "../db.js";

const app = new Hono();

// GET / — list active merchants, optional ?type= filter
app.get("/", (c) => {
  const type = c.req.query("type");
  const merchants = getMerchants(type || undefined);
  return c.json({ merchants });
});

// GET /:id/items — service items for a merchant
app.get("/:id/items", (c) => {
  const merchant = getMerchant(c.req.param("id"));
  if (!merchant) return c.json({ error: "Merchant not found" }, 404);
  const items = getServiceItems(merchant.id);
  return c.json({ merchant, items });
});

export default app;
