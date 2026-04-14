import { Hono } from "hono";
import { listTodos, updateTodo } from "../db.js";

const app = new Hono();

/**
 * PATCH /api/tasks/:id/status
 * Body: { telegramId: number, status: "done" | "pending" }
 *
 * Accepts either a full task id or a short prefix (first 8 chars, same
 * convention as the complete_task tool). Returns the updated task.
 */
app.patch("/:id/status", async (c) => {
  const id = c.req.param("id");
  let body: { telegramId?: number; status?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }

  const telegramId = Number(body.telegramId);
  const status = body.status;

  if (!telegramId || !id) {
    return c.json({ error: "telegramId and id required" }, 400);
  }
  if (status !== "done" && status !== "pending") {
    return c.json({ error: "status must be 'done' or 'pending'" }, 400);
  }

  const todos = listTodos(telegramId, "all");
  const match = todos.find((t) => t.id === id || t.id.startsWith(id));
  if (!match) return c.json({ error: "task not found" }, 404);

  const updated = updateTodo(telegramId, match.id, { status });
  if (!updated) return c.json({ error: "failed to update" }, 500);

  return c.json({
    ok: true,
    task: { id: updated.id, shortId: updated.id.slice(0, 8), status: updated.status },
  });
});

export default app;
