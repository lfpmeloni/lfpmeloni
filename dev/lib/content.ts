import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Markdown sources live outside the app code so editing them is the whole workflow. */
const CONTENT_DIR = path.join(process.cwd(), "src");

/** Sidebar order. Anything not listed is appended alphabetically, so new files just show up. */
const MAIN_ORDER = [
  "README.md",
  "RESUME.md",
  "STACK.md",
  "PORTFOLIO/",
  "RECRUITERS.md",
  "AGENTS.md",
  "CONTACT.md",
];

/** Files shown small, at the bottom of the sidebar. */
const FOOTNOTE_ORDER = ["LLMS.md", "PRIVACY.md"];

/**
 * Pages that build and open by URL but stay out of the sidebar, sitemap and llms files, and are
 * noindex. To publish one, remove it here and add it to MAIN_ORDER.
 */
const HIDDEN = ["SERVICES.md", "LEISTUNGEN.md"];

/** Order inside folders (effort order for PORTFOLIO/). Unlisted files follow alphabetically. */
const DIR_ORDER: Record<string, string[]> = {
  PORTFOLIO: [
    "veterinary-marketplace.md",
    "financial-portfolio-agents.md",
    "ai-video-pipeline.md",
    "real-estate-mcp.md",
    "lfpmeloni-dev.md",
  ],
};

export function compareInDir(dir: string, a: string, b: string): number {
  const order = DIR_ORDER[dir] ?? [];
  const d = rank(a, order) - rank(b, order);
  return d !== 0 ? d : a.localeCompare(b);
}

export type Doc = {
  /** Path relative to the content dir, e.g. "portfolio/real-estate-mcp.md". */
  file: string;
  /** URL path, e.g. "/PORTFOLIO/real-estate-mcp.md". */
  route: string;
  /** Directory segment as displayed, e.g. "PORTFOLIO" or null at the root. */
  dir: string | null;
  name: string;
  source: string;
};

export type TreeNode =
  | { kind: "file"; label: string; route: string }
  | { kind: "dir"; label: string; children: TreeNode[] };

export type Heading = { depth: number; text: string; id: string };

function walk(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".md")) out.push(rel);
  }
  return out;
}

function toRoute(file: string): string {
  const parts = file.split("/");
  const name = parts.pop()!;
  return "/" + [...parts.map((p) => p.toUpperCase()), name].join("/");
}

function rank(key: string, order: string[]): number {
  const i = order.indexOf(key);
  return i === -1 ? order.length : i;
}

let cache: Doc[] | null = null;

export function getDocs(): Doc[] {
  if (cache) return cache;
  const files = walk(CONTENT_DIR);
  const docs = files.map((file) => {
    const parts = file.split("/");
    const name = parts[parts.length - 1];
    const dir = parts.length > 1 ? parts[parts.length - 2].toUpperCase() : null;
    return {
      file,
      route: toRoute(file),
      dir,
      name,
      source: fs.readFileSync(path.join(CONTENT_DIR, file), "utf8").replace(/\s+$/, ""),
    };
  });
  cache = docs;
  return docs;
}

export function isHidden(doc: Pick<Doc, "dir" | "name">): boolean {
  return !doc.dir && HIDDEN.includes(doc.name);
}

/** Everything a visitor or crawler is meant to find. */
export function getPublicDocs(): Doc[] {
  return getDocs().filter((d) => !isHidden(d));
}

/** Last commit date of a source file, or undefined when git history isn't available. */
export function getLastModified(doc: Doc): Date | undefined {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", doc.file], {
      cwd: CONTENT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? new Date(out) : undefined;
  } catch {
    return undefined;
  }
}

export function getDoc(route: string): Doc | undefined {
  const want = route.toLowerCase();
  return getDocs().find((d) => d.route.toLowerCase() === want);
}

export function getHome(): Doc {
  const home = getDoc("/README.md");
  if (!home) throw new Error("src/README.md is required: it is the homepage.");
  return home;
}

/** The filesystem tree for the left sidebar, excluding the footnote files. */
export function getTree(): TreeNode[] {
  const docs = getPublicDocs().filter((d) => !FOOTNOTE_ORDER.includes(d.name) || d.dir);
  const roots: TreeNode[] = [];
  const dirs = new Map<string, TreeNode & { kind: "dir" }>();

  for (const doc of docs) {
    if (!doc.dir) {
      roots.push({ kind: "file", label: doc.name, route: doc.route });
      continue;
    }
    let node = dirs.get(doc.dir);
    if (!node) {
      node = { kind: "dir", label: doc.dir, children: [] };
      dirs.set(doc.dir, node);
      roots.push(node);
    }
    node.children.push({ kind: "file", label: doc.name, route: doc.route });
  }

  for (const dir of dirs.values()) {
    dir.children.sort((a, b) => compareInDir(dir.label, a.label, b.label));
  }

  return roots.sort((a, b) => {
    const ka = a.kind === "dir" ? `${a.label}/` : a.label;
    const kb = b.kind === "dir" ? `${b.label}/` : b.label;
    const d = rank(ka, MAIN_ORDER) - rank(kb, MAIN_ORDER);
    return d !== 0 ? d : ka.localeCompare(kb);
  });
}

/** Small links under the tree: non-essential pages. */
export function getFootnoteDocs(): Doc[] {
  return getDocs()
    .filter((d) => !d.dir && FOOTNOTE_ORDER.includes(d.name))
    .sort((a, b) => rank(a.name, FOOTNOTE_ORDER) - rank(b.name, FOOTNOTE_ORDER));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`|\*\*|\*/g, "")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The first `> ` line of a doc: its one-line hook, reused as the page's SEO description. */
export function getDescription(source: string): string | undefined {
  const m = /^>\s?(.+)$/m.exec(source);
  if (!m) return undefined;
  return m[1]
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`|\*\*/g, "")
    .trim();
}

/** Headings, in document order, for the right-hand section list. */
export function getHeadings(source: string): Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  const seen = new Map<string, number>();

  for (const line of source.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!m) continue;
    const text = m[2].trim();
    let id = slugify(text) || "section";
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n}`;
    out.push({ depth: m[1].length, text, id });
  }
  return out;
}
