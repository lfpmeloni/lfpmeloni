import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Duration from "@/components/Duration";
import { getHeadings, slugify } from "./content";

/**
 * Renders Markdown *source*, not rendered Markdown: every `#`, `**`, `-` and backtick
 * stays visible. Only syntax highlighting, line numbers and clickable links are added.
 */

const MONTH =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December) \\d{4}";

const INLINE = new RegExp(
  [
    /(?<code>`[^`\n]+`)/.source,
    /(?<bold>\*\*[^*\n]+\*\*)/.source,
    /(?<fnref>\[\^[a-z0-9-]+\])/.source,
    /(?<link>\[[^\]\n]+\]\([^)\n]+\))/.source,
    /(?<url><?https?:\/\/[^\s)<>]+>?)/.source,
    /(?<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/.source,
    `(?<date>${MONTH} - (?:${MONTH}|Present))`,
  ].join("|"),
  "g",
);

/** A footnote definition line: `[^id]: text`. Used for the "Glossary for nerds" sections. */
const FOOTNOTE = /^\[\^([a-z0-9-]+)\]:\s+(.*)$/;

/** Footnote id -> plain definition text, so references can show it on hover. */
type Notes = Map<string, string>;

const FNREF = /\[\^([a-z0-9-]+)\]/g;

function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/`|\*\*/g, "");
}

/** Build date, so "Present" durations render the same on server and first client paint. */
const BUILT = new Date().toISOString();

function anchor(href: string, children: ReactNode, className: string, key: string) {
  const internal = href.startsWith("/") || href.startsWith("#");
  if (internal) {
    return (
      <Link key={key} href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a
      key={key}
      href={href}
      className={className}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noreferrer noopener"
    >
      {children}
    </a>
  );
}

function inline(text: string, key: string, notes: Notes = new Map()): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;

  for (const m of text.matchAll(INLINE)) {
    const start = m.index!;
    if (start > last) out.push(text.slice(last, start));
    last = start + m[0].length;
    const k = `${key}-${i++}`;

    const g = m.groups!;

    if (g.code) {
      out.push(
        <span key={k} className="t-code">
          {g.code}
        </span>,
      );
    } else if (g.bold) {
      out.push(
        <span key={k} className="t-bold">
          {g.bold}
        </span>,
      );
    } else if (g.fnref) {
      const id = g.fnref.slice(2, -1);
      out.push(
        <a key={k} id={`ref-${id}`} href={`#fn-${id}`} className="t-fnref" title={notes.get(id)}>
          {g.fnref}
        </a>,
      );
    } else if (g.link) {
      const sep = g.link.indexOf("](");
      const label = g.link.slice(1, sep);
      const href = g.link.slice(sep + 2, -1);
      out.push(
        <span key={k} className="t-link">
          <span className="t-punct">[</span>
          {anchor(href, label, "t-linktext", `${k}-a`)}
          <span className="t-punct">](</span>
          {anchor(href, href, "t-url", `${k}-b`)}
          <span className="t-punct">)</span>
        </span>,
      );
    } else if (g.url) {
      const bare = g.url.replace(/^<|>$/g, "");
      out.push(anchor(bare, g.url, "t-url", k));
    } else if (g.email) {
      out.push(anchor(`mailto:${g.email}`, g.email, "t-url", k));
    } else if (g.date) {
      const [from, to] = g.date.split(" - ");
      out.push(
        <span key={k} className="t-date">
          {g.date}
          <Duration from={from} to={to} built={BUILT} />
        </span>,
      );
    }
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Line = { className: string; content: ReactNode; id?: string; hang?: number };

function parseLine(raw: string, n: number, notes: Notes, refs: Set<string>): Line {
  const key = `l${n}`;

  const note = FOOTNOTE.exec(raw);
  if (note) {
    const [, id, text] = note;
    return {
      className: "line-fn",
      id: `fn-${id}`,
      hang: 2,
      content: (
        <>
          <span className="t-fnmark">[^{id}]:</span> {inline(text, key, notes)}
          {/* Terms that only appear inside diagrams have no reference to jump back to. */}
          {refs.has(id) && (
            <>
              {" "}
              <a href={`#ref-${id}`} className="t-fnback" aria-label="Back to the text">
                ↩
              </a>
            </>
          )}
        </>
      ),
    };
  }

  const heading = /^(#{1,6})(\s+)(.*)$/.exec(raw);
  if (heading) {
    const depth = heading[1].length;
    return {
      className: `line-h h${depth}`,
      id: slugify(heading[3].trim()) || undefined,
      content: (
        <>
          <span className="t-hash">{heading[1]}</span>
          {heading[2]}
          <span className="t-htext">{inline(heading[3], key, notes)}</span>
        </>
      ),
    };
  }

  const quote = /^(\s*>\s?)(.*)$/.exec(raw);
  if (quote) {
    return {
      className: "line-quote",
      content: (
        <>
          <span className="t-quote">{quote[1]}</span>
          <span className="t-quotetext">{inline(quote[2], key, notes)}</span>
        </>
      ),
    };
  }

  const bullet = /^(\s*)([-*+]|\d+\.)(\s+)(.*)$/.exec(raw);
  if (bullet) {
    return {
      className: "line-list",
      hang: bullet[1].length + bullet[2].length + bullet[3].length,
      content: (
        <>
          {bullet[1]}
          <span className="t-bullet">{bullet[2]}</span>
          {bullet[3]}
          {inline(bullet[4], key, notes)}
        </>
      ),
    };
  }

  if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(raw)) {
    return { className: "line-rule", content: <span className="t-rule">{raw}</span> };
  }

  return { className: "line-text", content: inline(raw, key, notes) };
}

export function MarkdownSource({ source }: { source: string }) {
  const lines = source.split("\n");
  let inFence = false;
  const used = new Map<string, number>();
  const notes: Notes = new Map();
  const refs = new Set<string>();
  let scanFence = false;
  for (const raw of lines) {
    if (/^\s*```/.test(raw)) scanFence = !scanFence;
    if (scanFence) continue;
    const m = FOOTNOTE.exec(raw);
    if (m) notes.set(m[1], plain(m[2]));
    else for (const r of raw.matchAll(FNREF)) refs.add(r[1]);
  }

  /** Top-level children: plain lines, or a .fence wrapper holding a whole code block. */
  const blocks: ReactNode[] = [];
  let fence: ReactNode[] | null = null;

  lines.forEach((raw, idx) => {
    const n = idx + 1;
    const isFence = /^\s*```/.test(raw);

    let line: Line;
    if (isFence) {
      line = {
        className: "line-fence",
        content: <span className="t-fence">{raw}</span>,
      };
    } else if (inFence) {
      line = { className: "line-fence", content: <span className="t-fenced">{raw}</span> };
    } else {
      line = parseLine(raw, n, notes, refs);
    }

    let id = line.id;
    if (id) {
      const seen = used.get(id) ?? 0;
      used.set(id, seen + 1);
      if (seen > 0) id = `${id}-${seen}`;
    }

    const el = (
      <div key={n} id={id} className={`line ${line.className}`}>
        {/* The number comes from CSS, so it stays out of the text crawlers and models read. */}
        <span className="num" data-n={n} aria-hidden="true" />
        <span
          className="code"
          style={line.hang ? ({ "--hang": `${line.hang}ch` } as CSSProperties) : undefined}
        >
          {line.content || " "}
        </span>
      </div>
    );

    if (isFence && !inFence) {
      fence = [el];
    } else if (fence) {
      fence.push(el);
    } else {
      blocks.push(el);
    }

    if (isFence) {
      if (inFence && fence) {
        blocks.push(
          <div key={`f${n}`} className="fence">
            {fence}
          </div>,
        );
        fence = null;
      }
      inFence = !inFence;
    }
  });

  // An unclosed fence still renders.
  if (fence) blocks.push(<div key="f-open" className="fence">{fence}</div>);

  return <div className="source">{blocks}</div>;
}

export { getHeadings };
