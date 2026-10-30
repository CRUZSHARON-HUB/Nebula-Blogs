import { useMemo } from "react";

function parseInline(text) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  const parts = text.split(pattern).filter((part) => part !== "");
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (/^`[^`]+`$/.test(part)) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const safe = /^(https?:\/\/|\/)/.test(href);
      if (!safe) return <span key={index}>{label}</span>;
      const external = href.startsWith("http");
      return (
        <a
          key={index}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {label}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

const SPECIAL = /^(#{1,4}\s|>|```|[-*]\s|\d+\.\s)/;

function parseBlocks(text) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", text: code.join("\n"), lang });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: `h${heading[1].length}`, text: heading[2] });
      i += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !SPECIAL.test(lines[i].trim())) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
    } else {
      blocks.push({ type: "p", text: line });
      i += 1;
    }
  }

  return blocks;
}

export function Markdown({ text }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <div className="prose">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h1":
            return <h1 key={index}>{parseInline(block.text)}</h1>;
          case "h2":
            return <h2 key={index}>{parseInline(block.text)}</h2>;
          case "h3":
            return <h3 key={index}>{parseInline(block.text)}</h3>;
          case "h4":
            return <h4 key={index}>{parseInline(block.text)}</h4>;
          case "quote":
            return (
              <blockquote key={index}>
                <span className="prose__quote-mark" aria-hidden="true">
                  “
                </span>
                <p>{parseInline(block.text)}</p>
              </blockquote>
            );
          case "code":
            return (
              <div className="prose__code" key={index}>
                <div className="prose__code-bar">
                  <span>{block.lang || "code"}</span>
                  <span className="prose__code-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <pre>
                  <code>{block.text}</code>
                </pre>
              </div>
            );
          case "ul":
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{parseInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{parseInline(item)}</li>
                ))}
              </ol>
            );
          default:
            return <p key={index}>{parseInline(block.text)}</p>;
        }
      })}
    </div>
  );
}
