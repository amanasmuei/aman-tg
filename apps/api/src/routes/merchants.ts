import { Hono } from "hono";
import { getMerchants, getMerchant, getServiceItems } from "../db.js";

const app = new Hono();

// GET / — list active merchants, optional ?type= filter
// Enriches each merchant with price_min, price_max, item_count, popular_items
app.get("/", (c) => {
  const type = c.req.query("type");
  const merchants = getMerchants(type || undefined);

  const enriched = merchants.map((merchant) => {
    const items = getServiceItems(merchant.id);
    const prices = items.map((i) => i.price);
    const price_min = prices.length > 0 ? Math.min(...prices) : null;
    const price_max = prices.length > 0 ? Math.max(...prices) : null;
    const item_count = items.length;
    const popular_items = items
      .filter((i) => i.popular)
      .slice(0, 3)
      .map((i) => ({ id: i.id, name: i.name, price: i.price }));
    // fallback: if fewer than 3 popular items, fill from top items
    if (popular_items.length < 3) {
      const popularIds = new Set(popular_items.map((i) => i.id));
      for (const item of items) {
        if (popular_items.length >= 3) break;
        if (!popularIds.has(item.id)) {
          popular_items.push({ id: item.id, name: item.name, price: item.price });
        }
      }
    }

    return {
      ...merchant,
      price_min,
      price_max,
      item_count,
      popular_items,
    };
  });

  return c.json({ merchants: enriched });
});

// GET /:id/items — service items for a merchant
app.get("/:id/items", (c) => {
  const merchant = getMerchant(c.req.param("id"));
  if (!merchant) return c.json({ error: "Merchant not found" }, 404);
  const items = getServiceItems(merchant.id);
  return c.json({ merchant, items });
});

export default app;
