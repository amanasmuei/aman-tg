/**
 * Tool definitions and execution for Mini App agents.
 * Same pattern as aman-agent MCP tools, adapted for the API server.
 */

import { addTodo, listTodos, completeTodo, deleteTodo, type DbTodo } from "./db.js";
import { checkToolCall } from "./guardrails.js";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolResult {
  content: string;
  is_error?: boolean;
}

/** Context passed to tool execution (e.g., which user is calling) */
export interface ToolContext {
  telegramId?: number;
}

// ── Tool Definitions ────────────────────────────────

// Ollama/OpenAI-compatible tool format
export interface OllamaToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "fetch_url",
    description:
      "Fetch and extract readable text content from a URL. Use this when the user shares a link or asks you to analyze/read a website, article, or web page. Returns the page title and main text content.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch (must start with http:// or https://)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "calculate",
    description:
      "Evaluate a mathematical expression. Use this for arithmetic, percentages, unit conversions, financial calculations (EMI, interest, etc). Supports: add, subtract, multiply, divide, power.",
    input_schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The math expression to evaluate, e.g. '500000 * 0.04 / 12' or '15 * 1.06'",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "add_task",
    description:
      "Add a new task/todo for the user. Use this when the user wants to remember something, create a task, add a to-do, set a reminder, or track something they need to do.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short title of the task",
        },
        description: {
          type: "string",
          description: "Optional longer description or details",
        },
        priority: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Task priority (default: medium)",
        },
        due_date: {
          type: "string",
          description: "Optional due date in YYYY-MM-DD format",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description:
      "List the user's tasks/todos. Use this when the user wants to see their tasks, check what they need to do, review pending items, or see completed tasks.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "done", "all"],
          description: "Filter by status (default: pending)",
        },
      },
    },
  },
  {
    name: "complete_task",
    description:
      "Mark a task as done/completed. Use this when the user says they finished a task, completed something, or wants to check off an item.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The ID of the task to mark as done",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "delete_task",
    description:
      "Delete/remove a task permanently. Use this when the user wants to remove a task they no longer need.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The ID of the task to delete",
        },
      },
      required: ["task_id"],
    },
  },
];

// ── Ollama-compatible format ────────────────────────

export const OLLAMA_TOOLS: OllamaToolDefinition[] = TOOLS.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

// ── Tool Execution ──────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx?: ToolContext,
): Promise<ToolResult> {
  // Guardrail check before execution
  const blocked = checkToolCall(name, input);
  if (blocked) {
    return { content: blocked, is_error: true };
  }

  switch (name) {
    case "fetch_url":
      return fetchUrl(input.url as string);
    case "calculate":
      return calculate(input.expression as string);
    case "add_task":
      return handleAddTask(input, ctx);
    case "list_tasks":
      return handleListTasks(input, ctx);
    case "complete_task":
      return handleCompleteTask(input, ctx);
    case "delete_task":
      return handleDeleteTask(input, ctx);
    default:
      return { content: `Unknown tool: ${name}`, is_error: true };
  }
}

// ── fetch_url ───────────────────────────────────────

async function fetchUrl(url: string): Promise<ToolResult> {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return { content: "Invalid URL. Must start with http:// or https://", is_error: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AmanBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,text/plain,application/json",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { content: `Failed to fetch URL: HTTP ${res.status}`, is_error: true };
    }

    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();

    if (contentType.includes("application/json")) {
      const truncated = body.length > 8000 ? body.slice(0, 8000) + "\n\n[... truncated]" : body;
      return { content: `[JSON from ${url}]\n${truncated}` };
    }

    if (contentType.includes("text/html")) {
      const text = extractTextFromHtml(body);
      const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n\n[... truncated]" : text;
      return { content: `[Web page: ${url}]\n\n${truncated}` };
    }

    const truncated = body.length > 8000 ? body.slice(0, 8000) + "\n\n[... truncated]" : body;
    return { content: `[Content from ${url}]\n${truncated}` };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { content: "Request timed out (15s limit)", is_error: true };
    }
    return {
      content: `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}`,
      is_error: true,
    };
  }
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote|section|article)[^>]*>/gi, "\n")
    .replace(/<\/?(ul|ol|table|thead|tbody)[^>]*>/gi, "\n");

  text = text.replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");

  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  text = text.replace(/\n{3,}/g, "\n\n");

  return title ? `Title: ${title}\n\n${text}` : text;
}

// ── calculate ───────────────────────────────────────

function calculate(expression: string): ToolResult {
  if (!expression) {
    return { content: "No expression provided", is_error: true };
  }

  // Parse and evaluate safely without eval/Function
  try {
    const result = safeEvaluate(expression);
    return { content: `${expression} = ${result}` };
  } catch {
    return { content: `Failed to evaluate: ${expression}`, is_error: true };
  }
}

/**
 * Safe math evaluator — no eval, no Function constructor.
 * Handles: +, -, *, /, %, ** (power), parentheses.
 */
function safeEvaluate(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;

  function peek(): string | null {
    return pos < tokens.length ? tokens[pos] : null;
  }

  function consume(): string {
    return tokens[pos++];
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = consume();
      const right = parsePower();
      if (op === "*") left = left * right;
      else if (op === "/") left = left / right;
      else left = left % right;
    }
    return left;
  }

  function parsePower(): number {
    let base = parseUnary();
    while (peek() === "**" || peek() === "^") {
      consume();
      const exp = parseUnary();
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === "-") {
      consume();
      return -parseAtom();
    }
    if (peek() === "+") {
      consume();
    }
    return parseAtom();
  }

  function parseAtom(): number {
    if (peek() === "(") {
      consume(); // (
      const val = parseExpression();
      if (peek() === ")") consume(); // )
      return val;
    }
    const token = consume();
    const num = parseFloat(token);
    if (isNaN(num)) throw new Error(`Invalid number: ${token}`);
    return num;
  }

  const result = parseExpression();
  if (!isFinite(result)) throw new Error("Result is not finite");
  return Math.round(result * 1e10) / 1e10; // Avoid floating point noise
}

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const s = expr.replace(/\s/g, "");

  while (i < s.length) {
    // Number (including decimals)
    if (/[\d.]/.test(s[i])) {
      let num = "";
      while (i < s.length && /[\d.e]/.test(s[i])) {
        num += s[i++];
      }
      tokens.push(num);
      continue;
    }

    // ** operator
    if (s[i] === "*" && s[i + 1] === "*") {
      tokens.push("**");
      i += 2;
      continue;
    }

    // Single char operators and parens
    if ("+-*/%^()".includes(s[i])) {
      tokens.push(s[i]);
      i++;
      continue;
    }

    i++; // skip unknown chars
  }

  return tokens;
}

// ── Todo tool handlers ─────────────────────────────

function formatTodo(t: DbTodo): string {
  const status = t.status === "done" ? "✅" : "⬜";
  const priority = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
  const due = t.due_date ? ` (due: ${t.due_date})` : "";
  const desc = t.description ? `\n   ${t.description}` : "";
  return `${status} ${priority} **${t.title}**${due}${desc}\n   ID: \`${t.id.slice(0, 8)}\``;
}

function handleAddTask(input: Record<string, unknown>, ctx?: ToolContext): ToolResult {
  if (!ctx?.telegramId) return { content: "User context required", is_error: true };
  const title = (input.title as string || "").trim();
  if (!title) return { content: "Task title is required", is_error: true };

  const todo = addTodo(
    ctx.telegramId,
    title.slice(0, 200),
    ((input.description as string) || "").slice(0, 500),
    (input.priority as "high" | "medium" | "low") || "medium",
    input.due_date as string | undefined,
  );

  return { content: `Task added!\n\n${formatTodo(todo)}` };
}

function handleListTasks(input: Record<string, unknown>, ctx?: ToolContext): ToolResult {
  if (!ctx?.telegramId) return { content: "User context required", is_error: true };

  const status = (input.status as "pending" | "done" | "all") || "pending";
  const todos = listTodos(ctx.telegramId, status);

  if (todos.length === 0) {
    return { content: status === "pending" ? "No pending tasks! You're all caught up." : `No ${status} tasks found.` };
  }

  const label = status === "all" ? "All tasks" : status === "done" ? "Completed tasks" : "Pending tasks";
  const list = todos.map(formatTodo).join("\n\n");
  return { content: `${label} (${todos.length}):\n\n${list}` };
}

function handleCompleteTask(input: Record<string, unknown>, ctx?: ToolContext): ToolResult {
  if (!ctx?.telegramId) return { content: "User context required", is_error: true };
  const taskId = (input.task_id as string || "").trim();
  if (!taskId) return { content: "Task ID is required", is_error: true };

  // Support short IDs (first 8 chars)
  const todos = listTodos(ctx.telegramId, "all");
  const match = todos.find((t) => t.id === taskId || t.id.startsWith(taskId));
  if (!match) return { content: `Task not found: ${taskId}`, is_error: true };

  const result = completeTodo(ctx.telegramId, match.id);
  if (!result) return { content: "Failed to complete task", is_error: true };
  return { content: `Task completed!\n\n${formatTodo(result)}` };
}

function handleDeleteTask(input: Record<string, unknown>, ctx?: ToolContext): ToolResult {
  if (!ctx?.telegramId) return { content: "User context required", is_error: true };
  const taskId = (input.task_id as string || "").trim();
  if (!taskId) return { content: "Task ID is required", is_error: true };

  // Support short IDs
  const todos = listTodos(ctx.telegramId, "all");
  const match = todos.find((t) => t.id === taskId || t.id.startsWith(taskId));
  if (!match) return { content: `Task not found: ${taskId}`, is_error: true };

  const ok = deleteTodo(ctx.telegramId, match.id);
  return ok
    ? { content: `Task "${match.title}" deleted.` }
    : { content: "Failed to delete task", is_error: true };
}
