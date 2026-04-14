import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bodyLimit } from "hono/body-limit";
import { validateInitData } from "./auth.js";
import agentsRoute from "./routes/agents.js";
import chatRoute from "./routes/chat.js";
import conversationsRoute from "./routes/conversations.js";
import usersRoute from "./routes/users.js";
import adminRoute from "./routes/admin.js";
import referralsRoute from "./routes/referrals.js";
import merchantsRoute from "./routes/merchants.js";
import ordersRoute from "./routes/orders.js";
import tasksRoute from "./routes/tasks.js";
import { getDb } from "./db.js";
import { loadRules } from "./guardrails.js";
import path from "node:path";
import fs from "node:fs";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
}));

// Request body size limit — prevents DoS via large payloads
app.use("/api/*", bodyLimit({ maxSize: 15 * 1024 * 1024 })); // 15MB max (for base64 images)

// Auth middleware for protected routes
app.use("/api/*", async (c, next) => {
  const initData = c.req.header("x-telegram-init-data");
  const botToken = process.env.BOT_TOKEN;

  // If initData is provided, validate it
  if (initData && botToken) {
    const { valid, user } = validateInitData(initData, botToken);
    if (valid) {
      c.set("telegramUser" as never, user);
    }
  }

  return next();
});

// Initialize database and guardrails
getDb();
loadRules();

// Routes
app.route("/api/agents", agentsRoute);
app.route("/api/chat", chatRoute);
app.route("/api/conversations", conversationsRoute);
app.route("/api/users", usersRoute);
app.route("/api/admin", adminRoute);
app.route("/api/referrals", referralsRoute);
app.route("/api/merchants", merchantsRoute);
app.route("/api/orders", ordersRoute);
app.route("/api/tasks", tasksRoute);

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.2.0" }));

// Serve web frontend static files (for k3s/nginx-less deployments)
const webDistPath = process.env.WEB_DIST_PATH || path.join(process.cwd(), "apps", "web", "dist");
if (fs.existsSync(webDistPath)) {
  app.use("/assets/*", serveStatic({ root: webDistPath }));
  app.get("*", async (c, next) => {
    // Skip API routes and health check
    if (c.req.path.startsWith("/api") || c.req.path === "/health") return next();
    // Try static file first
    const filePath = path.join(webDistPath, c.req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return c.body(fs.readFileSync(filePath), 200, {
        "Content-Type": getContentType(filePath),
      });
    }
    // SPA fallback — serve index.html
    const indexPath = path.join(webDistPath, "index.html");
    return c.body(fs.readFileSync(indexPath), 200, {
      "Content-Type": "text/html; charset=utf-8",
    });
  });
  console.log(`[STATIC] Serving web frontend from ${webDistPath}`);
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
  };
  return types[ext] || "application/octet-stream";
}

// Start
const port = parseInt(process.env.PORT || "3000", 10);
console.log(`aman API server starting on port ${port}...`);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
