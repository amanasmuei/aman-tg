import React from "react";

/**
 * Chat-message Markdown renderer.
 *
 * Supported block types:
 *   - fenced code blocks  (```lang)
 *   - ATX headings        (# .. ####)
 *   - bullet lists        (-, *)
 *   - ordered lists       (1. 2. etc.)
 *   - task lists          (- [ ] / - [x])          [read-only, styled]
 *   - GFM tables          (| col | col |)
 *   - blockquotes         (> ...)
 *   - horizontal rules    (---, ___, ***)
 *   - paragraphs
 *
 * Inline:
 *   - **bold**, *italic*, `code`, ~~strike~~
 *   - [label](url)                               [opens in new tab]
 *   - status/priority chips:
 *       * bracket tokens: [High] [Medium] [Low] [Done] [Pending] [Open] [Blocked] [Urgent] [In Progress] [Todo]
 *       * emoji+word combos: 🔴 High, 🟡 Medium, 🟢 Low, ✅ Done, ⬜ Pending, ⏳ In Progress
 */

interface Props {
  content: string;
  /**
   * Called when a user taps a task checkbox that has a parsed `[#id]` suffix.
   * Receives the short id and the desired new state. ChatView wires this to
   * the PATCH /api/tasks/:id/status endpoint and applies an optimistic update.
   */
  onTaskToggle?: (taskId: string, done: boolean) => void;
  /**
   * Optional override map: taskId → done. Lets the parent reflect server state
   * without having to mutate the original message text.
   */
  taskOverrides?: Record<string, boolean>;
}

type TaskItem = { label: string; done: boolean; id?: string };

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string; level: number }
  | { kind: "code"; text: string; lang?: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "tasks"; items: TaskItem[] }
  | { kind: "table"; header: string[]; align: Align[]; rows: string[][] }
  | { kind: "quote"; text: string }
  | { kind: "hr" };

type Align = "left" | "center" | "right";

export function Markdown({ content, onTaskToggle, taskOverrides }: Props) {
  const blocks = React.useMemo(() => parseBlocks(content), [content]);
  return (
    <div className="md">
      {blocks.map((b, i) => renderBlock(b, i, { onTaskToggle, taskOverrides }))}
    </div>
  );
}

interface RenderCtx {
  onTaskToggle?: (taskId: string, done: boolean) => void;
  taskOverrides?: Record<string, boolean>;
}

/* ============================================================== Parsing */

function parseBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const out: Block[] = [];
  let i = 0;

  const isHr = (s: string) => /^\s{0,3}(-{3,}|_{3,}|\*{3,})\s*$/.test(s);
  const isBullet = (s: string) => /^\s{0,3}[-*]\s+/.test(s);
  const isTask = (s: string) => /^\s{0,3}[-*]\s+\[[ xX]\]\s+/.test(s);
  const isOrdered = (s: string) => /^\s{0,3}\d+[.)]\s+/.test(s);
  const isQuote = (s: string) => /^\s{0,3}>/.test(s);
  const isHeading = (s: string) => /^(#{1,4})\s+/.test(s);
  const isTableRow = (s: string) => /^\s*\|.*\|\s*$/.test(s);
  const isTableSep = (s: string) =>
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s);

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim() || undefined;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      out.push({ kind: "code", text: buf.join("\n"), lang });
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    if (isHr(line)) {
      out.push({ kind: "hr" });
      i++;
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      out.push({ kind: "heading", text: h[2].trim(), level: h[1].length });
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      const align = parseAlign(lines[i + 1]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push({ kind: "table", header, align, rows });
      continue;
    }

    if (isQuote(line)) {
      const buf: string[] = [];
      while (i < lines.length && isQuote(lines[i])) {
        buf.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i++;
      }
      out.push({ kind: "quote", text: buf.join("\n") });
      continue;
    }

    if (isTask(line)) {
      const items: TaskItem[] = [];
      while (i < lines.length && isTask(lines[i])) {
        const m = lines[i].match(/^\s{0,3}[-*]\s+\[([ xX])\]\s+(.*)$/);
        if (!m) break;
        let label = m[2];
        let id: string | undefined;
        const idMatch = label.match(/\s*\[#([\w-]{4,})\]\s*$/);
        if (idMatch) {
          id = idMatch[1];
          label = label.slice(0, idMatch.index ?? 0).trim();
        }
        items.push({ done: m[1].toLowerCase() === "x", label, id });
        i++;
      }
      out.push({ kind: "tasks", items });
      continue;
    }

    if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i]) && !isTask(lines[i])) {
        items.push(lines[i].replace(/^\s{0,3}[-*]\s+/, ""));
        i++;
      }
      out.push({ kind: "list", items, ordered: false });
      continue;
    }

    if (isOrdered(line)) {
      const items: string[] = [];
      while (i < lines.length && isOrdered(lines[i])) {
        items.push(lines[i].replace(/^\s{0,3}\d+[.)]\s+/, ""));
        i++;
      }
      out.push({ kind: "list", items, ordered: true });
      continue;
    }

    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !isHr(lines[i]) &&
      !isHeading(lines[i]) &&
      !isBullet(lines[i]) &&
      !isOrdered(lines[i]) &&
      !isQuote(lines[i]) &&
      !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) out.push({ kind: "paragraph", text: buf.join("\n") });
  }

  return out;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseAlign(sep: string): Align[] {
  return splitRow(sep).map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });
}

/* ============================================================= Rendering */

function renderBlock(block: Block, key: number, ctx: RenderCtx = {}): React.ReactNode {
  switch (block.kind) {
    case "heading": {
      const sizes = ["1.35rem", "1.15rem", "1rem", "0.95rem"];
      const weight = block.level <= 2 ? 500 : 500;
      const useDisplay = block.level <= 3;
      return (
        <div
          key={key}
          className="md-heading"
          style={{
            fontSize: sizes[block.level - 1] || "0.9rem",
            fontWeight: weight,
            margin: "0.9em 0 0.35em",
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
            color: "var(--tg-theme-text-color)",
            fontFamily: useDisplay
              ? '"Fraunces", ui-serif, Georgia, serif'
              : undefined,
          }}
        >
          {renderInline(block.text)}
        </div>
      );
    }
    case "code":
      return <CodeBlock key={key} text={block.text} lang={block.lang} />;

    case "list":
      return block.ordered ? (
        <ol
          key={key}
          className="md-list md-list-ordered"
          style={{
            margin: "0.4em 0",
            paddingLeft: "1.4em",
            listStyleType: "decimal",
            listStylePosition: "outside",
          }}
        >
          {block.items.map((it, j) => (
            <li key={j} style={{ margin: "0.18em 0", lineHeight: 1.55 }}>
              {renderInline(it)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={key} className="md-list" style={{ margin: "0.4em 0", padding: 0, listStyle: "none" }}>
          {block.items.map((it, j) => (
            <li
              key={j}
              style={{
                display: "flex",
                gap: "0.55em",
                alignItems: "flex-start",
                lineHeight: 1.55,
                margin: "0.18em 0",
              }}
            >
              <span
                aria-hidden
                style={{
                  flex: "none",
                  marginTop: "0.55em",
                  width: 4,
                  height: 4,
                  borderRadius: "999px",
                  background: "currentColor",
                  opacity: 0.5,
                }}
              />
              <span style={{ flex: 1 }}>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );

    case "tasks":
      return (
        <ul key={key} className="md-tasks" style={{ margin: "0.5em 0", padding: 0, listStyle: "none" }}>
          {block.items.map((it, j) => {
            const overrideDone = it.id ? ctx.taskOverrides?.[it.id] : undefined;
            const done = overrideDone ?? it.done;
            const interactive = !!it.id && !!ctx.onTaskToggle;
            return (
              <TaskRow
                key={j}
                item={it}
                done={done}
                isLast={j === block.items.length - 1}
                interactive={interactive}
                onToggle={
                  interactive && it.id
                    ? () => ctx.onTaskToggle?.(it.id as string, !done)
                    : undefined
                }
              />
            );
          })}
        </ul>
      );

    case "table":
      return <TableBlock key={key} header={block.header} rows={block.rows} align={block.align} />;

    case "quote":
      return (
        <blockquote
          key={key}
          className="md-quote"
          style={{
            margin: "0.6em 0",
            padding: "0.6em 0.9em",
            borderLeft: "3px solid var(--terra, var(--tg-theme-button-color))",
            background: "var(--md-quote-bg)",
            borderRadius: "0 10px 10px 0",
            fontStyle: "italic",
            fontFamily: '"Fraunces", ui-serif, Georgia, serif',
            color: "var(--tg-theme-text-color)",
            opacity: 0.95,
            lineHeight: 1.6,
          }}
        >
          {block.text.split("\n").map((line, idx) => (
            <div key={idx}>{renderInline(line)}</div>
          ))}
        </blockquote>
      );

    case "hr":
      return (
        <div
          key={key}
          aria-hidden
          style={{
            margin: "0.9em 0",
            height: 0,
            borderTop: "1px solid var(--md-rule)",
          }}
        />
      );

    case "paragraph":
    default:
      return (
        <p
          key={key}
          className="md-p"
          style={{ margin: "0.35em 0", lineHeight: 1.55 }}
        >
          {renderInline((block as { text: string }).text)}
        </p>
      );
  }
}

/* ============================================================== Task row */

function TaskRow({
  item,
  done,
  isLast,
  interactive,
  onToggle,
}: {
  item: TaskItem;
  done: boolean;
  isLast: boolean;
  interactive: boolean;
  onToggle?: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const handleClick = () => {
    if (!onToggle || pending) return;
    setPending(true);
    onToggle();
    // Brief pending state — release shortly after; the parent's optimistic
    // update flips the visual state in the same tick, so this is mostly to
    // suppress double-taps.
    window.setTimeout(() => setPending(false), 240);
  };

  const box = (
    <span
      aria-hidden
      style={{
        flex: "none",
        marginTop: "0.18em",
        width: 18,
        height: 18,
        borderRadius: 5,
        border: done
          ? "1.5px solid var(--tg-theme-button-color)"
          : "1.5px solid var(--md-rule-strong)",
        background: done ? "var(--tg-theme-button-color)" : "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--tg-theme-button-text-color, #fff)",
        fontSize: "11px",
        lineHeight: 1,
        transition: "background 160ms ease, border-color 160ms ease, transform 160ms ease",
        transform: pending ? "scale(0.92)" : "scale(1)",
      }}
    >
      {done ? "✓" : ""}
    </span>
  );

  return (
    <li
      style={{
        display: "flex",
        gap: "0.65em",
        alignItems: "flex-start",
        padding: "0.32em 0",
        borderBottom: isLast ? "none" : "1px dashed var(--md-rule)",
        lineHeight: 1.5,
        opacity: done ? 0.6 : 1,
      }}
    >
      {interactive ? (
        <button
          type="button"
          onClick={handleClick}
          aria-pressed={done}
          aria-label={done ? `Reopen task: ${item.label}` : `Complete task: ${item.label}`}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            // Generous tap target on mobile
            minWidth: 28,
            minHeight: 28,
            justifyContent: "center",
            borderRadius: 6,
            marginLeft: -5,
            marginRight: -5,
          }}
        >
          {box}
        </button>
      ) : (
        box
      )}
      <span
        style={{
          flex: 1,
          textDecoration: done ? "line-through" : "none",
          textDecorationColor: "var(--md-rule-strong)",
        }}
      >
        {renderInline(item.label)}
      </span>
    </li>
  );
}

/* ============================================================== Table */

function TableBlock({
  header,
  rows,
  align,
}: {
  header: string[];
  rows: string[][];
  align: Align[];
}) {
  const cols = header.length;
  return (
    <div
      className="md-table-wrap"
      style={{
        margin: "0.7em 0",
        overflowX: "auto",
        borderRadius: 10,
        border: "1px solid var(--md-rule)",
        background: "var(--md-table-bg)",
      }}
    >
      <table
        className="md-table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.82rem",
          lineHeight: 1.45,
        }}
      >
        <thead>
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: align[i] ?? "left",
                  padding: "0.55em 0.8em",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontSize: "0.68rem",
                  color: "var(--md-table-head)",
                  borderBottom: "1px solid var(--md-rule)",
                  background: "var(--md-table-head-bg)",
                }}
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr
              key={ri}
              style={{
                background: ri % 2 ? "var(--md-table-stripe)" : "transparent",
              }}
            >
              {Array.from({ length: cols }).map((_, ci) => (
                <td
                  key={ci}
                  style={{
                    textAlign: align[ci] ?? "left",
                    padding: "0.5em 0.8em",
                    borderTop: ri === 0 ? "none" : "1px solid var(--md-rule)",
                    verticalAlign: "top",
                  }}
                >
                  {renderInline(r[ci] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================ Code block */

function CodeBlock({ text, lang }: { text: string; lang?: string }) {
  return (
    <div
      className="md-code"
      style={{
        margin: "0.6em 0",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--md-rule)",
        background: "var(--md-code-bg)",
      }}
    >
      {lang && (
        <div
          style={{
            padding: "0.35em 0.85em",
            fontSize: "0.65rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--md-table-head)",
            background: "var(--md-table-head-bg)",
            borderBottom: "1px solid var(--md-rule)",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          {lang}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: "0.7em 0.85em",
          overflowX: "auto",
          fontSize: "0.8rem",
          lineHeight: 1.55,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          color: "var(--tg-theme-text-color)",
        }}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}

/* ============================================================== Inline */

type ChipTone = "danger" | "warn" | "ok" | "neutral" | "info";

const CHIP_MAP: Record<string, { label: string; tone: ChipTone }> = {
  high: { label: "High", tone: "danger" },
  urgent: { label: "Urgent", tone: "danger" },
  blocked: { label: "Blocked", tone: "danger" },
  medium: { label: "Medium", tone: "warn" },
  "in progress": { label: "In Progress", tone: "warn" },
  pending: { label: "Pending", tone: "neutral" },
  open: { label: "Open", tone: "neutral" },
  todo: { label: "Todo", tone: "neutral" },
  low: { label: "Low", tone: "ok" },
  done: { label: "Done", tone: "ok" },
  completed: { label: "Done", tone: "ok" },
};

function chipToneStyle(tone: ChipTone): React.CSSProperties {
  const tones: Record<ChipTone, { bg: string; fg: string; border: string }> = {
    danger: { bg: "rgba(197, 76, 51, 0.14)", fg: "#c54c33", border: "rgba(197, 76, 51, 0.3)" },
    warn: { bg: "rgba(200, 155, 60, 0.16)", fg: "#a97a20", border: "rgba(200, 155, 60, 0.35)" },
    ok: { bg: "rgba(47, 120, 74, 0.15)", fg: "#2f784a", border: "rgba(47, 120, 74, 0.3)" },
    info: { bg: "rgba(56, 120, 180, 0.15)", fg: "#386eb4", border: "rgba(56, 120, 180, 0.3)" },
    neutral: { bg: "rgba(120, 120, 120, 0.14)", fg: "var(--tg-theme-text-color)", border: "var(--md-rule-strong)" },
  };
  const t = tones[tone];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3em",
    padding: "0.08em 0.55em",
    borderRadius: 999,
    fontSize: "0.72rem",
    fontWeight: 500,
    letterSpacing: "0.02em",
    background: t.bg,
    color: t.fg,
    border: `1px solid ${t.border}`,
    lineHeight: 1.5,
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
  };
}

function Chip({ label, tone }: { label: string; tone: ChipTone }) {
  return <span style={chipToneStyle(tone)}>{label}</span>;
}

/**
 * Inline renderer. Handles:
 *   [text](url)      — link
 *   **text**         — bold
 *   *text* / _text_  — italic
 *   ~~text~~         — strike
 *   `code`           — inline code
 *   [TOKEN]          — chip   (when TOKEN is in CHIP_MAP)
 *   🔴 High / ✅ Done etc. — chip (emoji+word, replaces the pair)
 */
function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // First pass: rewrite emoji+word status combos AND bracketed tokens into a
  // sentinel form so they render as chips through a single code path.
  const EMOJI_PATTERNS: Array<[RegExp, keyof typeof CHIP_MAP]> = [
    [/🔴\s*High\b/gi, "high"],
    [/⚠️\s*Urgent\b/gi, "urgent"],
    [/🚫\s*Blocked\b/gi, "blocked"],
    [/🟡\s*Medium\b/gi, "medium"],
    [/⏳\s*In Progress\b/gi, "in progress"],
    [/⬜\s*Pending\b/gi, "pending"],
    [/🟢\s*Low\b/gi, "low"],
    [/✅\s*Done\b/gi, "done"],
    [/✔️?\s*Completed\b/gi, "completed"],
  ];

  let pre = text;
  for (const [re, key] of EMOJI_PATTERNS) {
    pre = pre.replace(re, `\x00CHIP\x01${key}\x02`);
  }
  pre = pre.replace(/\[([A-Za-z][A-Za-z \-]{1,20})\]/g, (full, inner: string) => {
    const key = inner.trim().toLowerCase();
    if (CHIP_MAP[key]) return `\x00CHIP\x01${key}\x02`;
    return full;
  });

  const regex =
    /(\x00CHIP\x01([a-z ]+?)\x02)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\*\*(.+?)\*\*)|(__(.+?)__)|(\*(.+?)\*)|(_([^_]+?)_)|(~~(.+?)~~)|(`([^`]+)`)/g;

  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;

  for (const m of pre.matchAll(regex)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(pre.slice(last, idx));

    if (m[1]) {
      const key = m[2];
      const info = CHIP_MAP[key];
      if (info) out.push(<Chip key={k++} label={info.label} tone={info.tone} />);
    } else if (m[3]) {
      out.push(
        <a
          key={k++}
          href={m[5]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--terra, var(--tg-theme-link-color))",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            textDecorationThickness: "1px",
            textDecorationColor:
              "color-mix(in srgb, var(--terra) 45%, transparent)",
          }}
        >
          {m[4]}
        </a>,
      );
    } else if (m[6]) {
      out.push(<strong key={k++} style={{ fontWeight: 600 }}>{m[7]}</strong>);
    } else if (m[8]) {
      out.push(<strong key={k++} style={{ fontWeight: 600 }}>{m[9]}</strong>);
    } else if (m[10]) {
      out.push(<em key={k++}>{m[11]}</em>);
    } else if (m[12]) {
      out.push(<em key={k++}>{m[13]}</em>);
    } else if (m[14]) {
      out.push(
        <s key={k++} style={{ opacity: 0.6 }}>
          {m[15]}
        </s>,
      );
    } else if (m[16]) {
      out.push(
        <code
          key={k++}
          style={{
            padding: "0.08em 0.4em",
            borderRadius: 5,
            fontSize: "0.85em",
            background: "var(--md-inline-code-bg)",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          {m[17]}
        </code>,
      );
    }

    last = idx + m[0].length;
  }

  if (last < pre.length) out.push(pre.slice(last));
  return out;
}
