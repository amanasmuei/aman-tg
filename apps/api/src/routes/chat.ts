import { Hono } from "hono";
import { streamText } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS } from "@aman-tg/shared";

const app = new Hono();

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  return new Anthropic({ apiKey });
}

// POST /chat — send message to agent with streaming
app.post("/", async (c) => {
  const body = await c.req.json();
  const { agentId, message, history } = body as {
    agentId: string;
    message: string;
    history?: Array<{ role: string; content: string }>;
  };

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  const client = getClient();
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

  // Build messages array
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (history) {
    for (const m of history) {
      if (m.role === "user" || m.role === "assistant") {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }
  messages.push({ role: "user", content: message });

  return streamText(c, async (stream) => {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 2048,
        system: agent.systemPrompt,
        messages,
        stream: true,
      });

      for await (const event of response) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          await stream.write(event.delta.text);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "LLM error";
      await stream.write(`\n\n[Error: ${errMsg}]`);
    }
  });
});

export default app;
