import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { AGENTS } from "@aman-tg/shared";

const app = new Hono();

// POST /chat — send message to agent
app.post("/", async (c) => {
  const body = await c.req.json();
  const { agentId, message, history } = body as {
    agentId: string;
    message: string;
    history?: Array<{ role: string; content: string }>;
  };

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  // Build messages for LLM
  const messages = [
    ...(history || []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // TODO: Connect to actual LLM (Anthropic/OpenAI)
  // For now, return a placeholder streaming response
  return streamText(c, async (stream) => {
    const placeholder = `[${agent.name}] I received your message: "${message}". LLM integration coming soon!`;
    for (const char of placeholder) {
      await stream.write(char);
      await stream.sleep(20);
    }
  });
});

export default app;
