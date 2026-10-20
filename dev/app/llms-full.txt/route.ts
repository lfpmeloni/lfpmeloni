import { getPublicDocs, getTree, type TreeNode } from "@/lib/content";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

function routes(nodes: TreeNode[]): string[] {
  return nodes.flatMap((n) => (n.kind === "dir" ? routes(n.children) : [n.route]));
}

/** Served at /llms-full.txt: every public page in one file, in sidebar order, for LLMs and agents. */
export function GET() {
  const docs = getPublicDocs();
  const ordered = routes(getTree());
  const rest = docs.map((d) => d.route).filter((r) => !ordered.includes(r));
  const body = [
    "# lfpmeloni.dev (full text)",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    `Every public page of ${SITE_URL}, concatenated. The page map is at ${SITE_URL}/llms.txt.`,
    ...[...ordered, ...rest].flatMap((route) => {
      const doc = docs.find((d) => d.route === route)!;
      return ["", "---", "", `Source: ${SITE_URL}${route}`, "", doc.source];
    }),
  ].join("\n");

  return new Response(body + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
