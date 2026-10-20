import { getHeadings, type Doc } from "@/lib/content";
import { docJsonLd } from "@/lib/jsonld";
import { MarkdownSource } from "@/lib/md";
import JsonLd from "./JsonLd";
import Outline from "./Outline";

export default function DocPage({ doc, home = false }: { doc: Doc; home?: boolean }) {
  const headings = getHeadings(doc.source);
  const data = docJsonLd(doc, { home });
  const crumbs = doc.route.replace(/^\//, "").split("/");

  return (
    <main className="content">
      <article className="doc" lang={doc.name === "LEISTUNGEN.md" ? "de" : undefined}>
        <div className="doc-head">
          <span className="crumb-root">lfpmeloni.dev/</span>
          {crumbs.map((c, i) => (
            <span key={c + i} className={i === crumbs.length - 1 ? "crumb-file" : "crumb-dir"}>
              {c}
              {i === crumbs.length - 1 ? "" : "/"}
            </span>
          ))}
          <span className="doc-meta">
            {doc.source.split("\n").length} lines · markdown source
          </span>
        </div>
        <MarkdownSource source={doc.source} />
      </article>
      <Outline headings={headings} />
      {data && <JsonLd data={data} />}
    </main>
  );
}
