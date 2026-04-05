import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { validateInitData } from "./auth.js";
import agentsRoute from "./routes/agents.js";
import chatRoute from "./routes/chat.js";
import conversationsRoute from "./routes/conversations.js";
import usersRoute from "./routes/users.js";
import adminRoute from "./routes/admin.js";
import { getDb } from "./db.js";

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

  // If initData is provided, validate it
  if (initData && botToken) {
    const { valid, user } = validateInitData(initData, botToken);
    if (valid) {
      c.set("telegramUser" as never, user);
    }
  }

  // Allow requests through — Mini App context may not always have initData
  // TODO: enforce strict auth once Telegram WebApp SDK is fully integrated
  return next();
});

// Initialize database
getDb();

// Routes
app.route("/api/agents", agentsRoute);
app.route("/api/chat", chatRoute);
app.route("/api/conversations", conversationsRoute);
app.route("/api/users", usersRoute);
app.route("/api/admin", adminRoute);

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.2.0" }));

// Start
const port = parseInt(process.env.PORT || "3000", 10);
console.log(`aman API server starting on port ${port}...`);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
