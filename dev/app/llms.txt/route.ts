import { getDoc, getPublicDocs } from "@/lib/content";

export const dynamic = "force-static";

/** Served at /llms.txt: the structured map for LLMs and agents. */
export function GET() {
  const doc = getDoc("/LLMS.md");
  const body =
    doc?.source ??
    ["# lfpmeloni.dev", "", ...getPublicDocs().map((d) => `- ${d.route}`)].join("\n");

  return new Response(body + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
