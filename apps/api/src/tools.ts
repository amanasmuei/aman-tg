/**
 * Tool definitions and execution for Mini App agents.
 * Same pattern as aman-agent MCP tools, adapted for the API server.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolResult {
  content: string;
  is_error?: boolean;
}

// ── Tool Definitions ────────────────────────────────

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
];

// ── Tool Execution ──────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case "fetch_url":
      return fetchUrl(input.url as string);
    case "calculate":
      return calculate(input.expression as string);
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
