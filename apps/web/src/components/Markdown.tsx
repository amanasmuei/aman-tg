import React from "react";

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: bold, italic, code, code blocks, lists, headings, line breaks.
 */

interface Props {
  content: string;
}

export function Markdown({ content }: Props) {
  const blocks = parseBlocks(content);
  return <>{blocks.map((block, i) => renderBlock(block, i))}</>;
}

interface Block {
  type: "paragraph" | "code" | "list" | "heading";
  content: string;
  lang?: string;
  items?: string[];
  level?: number;
  ordered?: boolean;
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", content: codeLines.join("\n"), lang });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.*)/);
    if (headingMatch) {
      blocks.push({ type: "heading", content: headingMatch[2], level: headingMatch[1].length });
      i++;
      continue;
    }

    // Bullet lists
    if (/^[\-\*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\-\*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", content: "", items });
      continue;
    }

    // Numbered lists
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[\.\)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", content: "", items, ordered: true });
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^[\-\*]\s/.test(lines[i].trim()) &&
      !/^\d+[\.\)]\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", content: paraLines.join("\n") });
    }
  }

  return blocks;
}

function renderBlock(block: Block, key: number): React.JSX.Element {
  switch (block.type) {
    case "code":
      return (
        <pre
          key={key}
          className="my-2 rounded-lg p-3 text-xs overflow-x-auto"
          style={{ background: "rgba(0,0,0,0.3)", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          {block.lang && (
            <div className="text-right mb-1" style={{ fontSize: "0.6rem", opacity: 0.5 }}>
              {block.lang}
            </div>
          )}
          <code>{block.content}</code>
        </pre>
      );

    case "heading":
      return (
        <div
          key={key}
          className="font-bold mt-2 mb-1"
          style={{ fontSize: block.level === 1 ? "1.1rem" : block.level === 2 ? "1rem" : "0.9rem" }}
        >
          {renderInline(block.content)}
        </div>
      );

    case "list":
      if (block.ordered) {
        return (
          <ol key={key} className="my-1.5 pl-5 space-y-1" style={{ listStyleType: "decimal" }}>
            {block.items?.map((item, j) => (
              <li key={j} className="text-sm leading-relaxed">{renderInline(item)}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={key} className="my-1.5 space-y-1">
          {block.items?.map((item, j) => (
            <li key={j} className="text-sm leading-relaxed flex gap-2">
              <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: "currentColor", opacity: 0.4 }} />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "paragraph":
    default:
      return (
        <p key={key} className="my-1 text-sm leading-relaxed">
          {renderInline(block.content)}
        </p>
      );
  }
}

function renderInline(text: string): (string | React.JSX.Element)[] {
  const result: (string | React.JSX.Element)[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;

  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      result.push(<strong key={keyIdx++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      result.push(<em key={keyIdx++}>{match[4]}</em>);
    } else if (match[5]) {
      // `code`
      result.push(
        <code
          key={keyIdx++}
          className="px-1.5 py-0.5 rounded text-xs"
          style={{ background: "rgba(0,0,0,0.25)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {match[6]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}
