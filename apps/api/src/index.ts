import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { validateInitData } from "./auth.js";
import agentsRoute from "./routes/agents.js";
import chatRoute from "./routes/chat.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: "*", // In production, restrict to your Mini App domain
}));

// Auth middleware for protected routes
app.use("/api/*", async (c, next) => {
  const initData = c.req.header("x-telegram-init-data");
  const botToken = process.env.BOT_TOKEN;

  // Skip auth in development
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  if (!initData || !botToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { valid, user } = validateInitData(initData, botToken);
  if (!valid) {
    return c.json({ error: "Invalid init data" }, 401);
  }

  // Attach user to context
  c.set("telegramUser" as never, user);
  return next();
});

// Routes
app.route("/api/agents", agentsRoute);
app.route("/api/chat", chatRoute);

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// Start
const port = parseInt(process.env.PORT || "3000", 10);
console.log(`aman API server starting on port ${port}...`);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
