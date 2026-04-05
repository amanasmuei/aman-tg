import { Hono } from "hono";
import { AGENTS, AGENT_CATEGORIES } from "@aman-tg/shared";

const app = new Hono();

// GET /agents — list all agents
app.get("/", (c) => {
  return c.json({ agents: AGENTS, categories: AGENT_CATEGORIES });
});

// GET /agents/:id — get single agent
app.get("/:id", (c) => {
  const agent = AGENTS.find((a) => a.id === c.req.param("id"));
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

export default app;
