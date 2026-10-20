import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocPage from "@/components/DocPage";
import { compareInDir, getDescription, getDoc, getDocs, type Doc } from "@/lib/content";
import { docMetadata } from "@/lib/meta";

type Params = { slug: string[] };

/** Every .md file, plus one index page per folder. */
export function generateStaticParams(): Params[] {
  const docs = getDocs();
  const dirs = new Set(
    docs.filter((d) => d.dir).map((d) => d.dir as string),
  );
  return [
    ...docs.map((d) => ({ slug: d.route.slice(1).split("/") })),
    ...[...dirs].map((dir) => ({ slug: [dir] })),
  ];
}

function dirListing(dir: string): Doc | null {
  const docs = getDocs().filter((d) => d.dir === dir);
  if (docs.length === 0) return null;
  const lines = [
    `# ${dir}/`,
    "",
    `> ${docs.length} files in \`${dir}/\`. One page per project, ordered by how much of me went into it.`,
    "",
    ...docs
      .slice()
      .sort((a, b) => compareInDir(dir, a.name, b.name))
      .map((d) => {
        const hook = getDescription(d.source);
        return `- [${d.name}](${d.route})${hook ? ` - ${hook}` : ""}`;
      }),
  ];
  return {
    file: `${dir}/`,
    route: `/${dir}/`,
    dir: null,
    name: `${dir}/`,
    source: lines.join("\n"),
  };
}

function resolve(slug: string[]): Doc | null {
  const path = "/" + slug.map(decodeURIComponent).join("/");
  const doc = getDoc(path);
  if (doc) return doc;
  if (slug.length === 1) return dirListing(slug[0].toUpperCase().replace(/\/$/, ""));
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = resolve(slug);
  return doc ? docMetadata(doc) : { title: slug.join("/") };
}

export default async function CatchAll({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const doc = resolve(slug);
  if (!doc) notFound();
  return <DocPage doc={doc} />;
}
