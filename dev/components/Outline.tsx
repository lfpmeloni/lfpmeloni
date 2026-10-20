import type { Heading } from "@/lib/content";

/** Right rail: the document's sections, in title order. */
export default function Outline({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return <aside className="outline" />;
  return (
    <aside className="outline">
      <div className="outline-inner">
        <p className="outline-title">sections</p>
        <ul>
          {headings.map((h) => (
            <li key={h.id} className={`o${Math.min(h.depth, 4)}`}>
              <a href={`#${h.id}`}>{h.text.replace(/`|\*\*/g, "")}</a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
