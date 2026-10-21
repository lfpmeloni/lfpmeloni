/**
 * Content lint, no browser. Runs before `next build` on Vercel, so a failure means no deploy.
 *   node scripts/check-content.mjs          sources: dev/src, app, lib, components, public
 *   node scripts/check-content.mjs --built  the generated HTML in .next/server/app
 * Every problem prints file:line: context, and the exit code is 1 if there is any.
 */
import fs from "node:fs";
import path from "node:path";
import { getDocs, getPublicDocs, getTree } from "../lib/content.ts";

const ROOT = process.cwd();
const BUILT = process.argv.includes("--built");
const problems = [];

function report(file, line, message, context = "") {
  const where = `${path.relative(ROOT, file)}:${line}`;
  problems.push(`${where}: ${message}${context ? `\n    ${context.trim().slice(0, 160)}` : ""}`);
}

function walk(dir, keep) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p, keep);
    return keep(e.name) ? [p] : [];
  });
}

/** Text patterns that must never ship. Each is checked line by line. */
const BANNED = [
  { re: /—/, message: "em dash (U+2014): use a colon, comma, parentheses or ' | '" },
  { re: /vibe[- ]?cod/i, message: 'banned wording: "vibe-coding" (say "AI-assisted development")' },
  { re: /private beta/i, message: 'stale status: "private beta" (it is an invite-only beta)' },
  { re: /TODO\(Felipe\)/, message: "unresolved TODO(Felipe)" },
];

function scanText(file, text, rules = BANNED) {
  text.split("\n").forEach((line, i) => {
    for (const { re, message } of rules) if (re.test(line)) report(file, i + 1, message, line);
  });
}

if (BUILT) {
  const out = path.join(ROOT, ".next/server/app");
  const files = walk(out, (n) => /\.(html|body|meta|rsc)$/.test(n));
  if (files.length === 0) report(out, 0, "no built pages found: run `next build` first");
  // The em dash and the TODO are what can leak through metadata, JSON-LD and the OG alt text.
  for (const f of files) scanText(f, fs.readFileSync(f, "utf8"), [BANNED[0], BANNED[3]]);
} else {
  const textFile = (n) => /\.(md|mdx|ts|tsx|mjs|js|css|json|txt|svg)$/.test(n);
  for (const dir of ["src", "app", "lib", "components", "public", "scripts"]) {
    for (const f of walk(path.join(ROOT, dir), textFile)) {
      // This script names the banned patterns on purpose.
      if (f === path.join(ROOT, "scripts/check-content.mjs")) continue;
      const rules = dir === "src" ? BANNED : [BANNED[0], BANNED[1]];
      scanText(f, fs.readFileSync(f, "utf8"), rules);
    }
  }
  checkDocs();
}

/** Footnotes, internal links and the page maps, against the same content model the site uses. */
function checkDocs() {
  const docs = getDocs();
  const routes = new Set(docs.map((d) => d.route.toLowerCase()));
  const dirs = new Set(docs.filter((d) => d.dir).map((d) => `/${d.dir}`.toLowerCase()));
  const extra = new Set(["/", "/llms.txt", "/llms-full.txt", "/sitemap.xml", "/robots.txt"]);

  for (const doc of docs) {
    const file = path.join(ROOT, "src", doc.file);
    const lines = doc.source.split("\n");
    const defs = new Map();
    const refs = new Set();
    const fenced = [];
    let inFence = false;

    lines.forEach((line, i) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return;
      }
      if (inFence) {
        fenced.push(line);
        return;
      }
      const def = /^\[\^([a-z0-9-]+)\]:?\s+(.*)$/.exec(line);
      if (def) defs.set(def[1], { line: i + 1, text: def[2] });
      else for (const m of line.matchAll(/\[\^([a-z0-9-]+)\]/g)) refs.add(m[1]);

      for (const m of line.matchAll(/\]\((\/[^)\s#]*)(#[^)]*)?\)/g)) {
        const target = m[1].replace(/\/$/, "") || "/";
        const t = target.toLowerCase();
        if (!routes.has(t) && !dirs.has(t) && !extra.has(t)) {
          report(file, i + 1, `internal link to a missing page: ${m[1]}`, line);
        }
      }
    });

    lines.forEach((line, i) => {
      if (/^\[\^/.test(line)) return;
      for (const m of line.matchAll(/\[\^([a-z0-9-]+)\]/g)) {
        if (!defs.has(m[1])) report(file, i + 1, `footnote [^${m[1]}] is referenced but never defined`, line);
      }
    });

    // A definition with no marker is only allowed for terms that appear only in a diagram,
    // and those take the last numbers (the glossary rule in the root AGENTS.md).
    const fence = fenced.join("\n").toLowerCase();
    const highestRef = Math.max(0, ...[...refs].map(Number).filter(Number.isFinite));
    for (const [id, { line, text }] of defs) {
      if (refs.has(id)) continue;
      const term = text.split(/:\s/)[0].replace(/\s*\(.*\)$/, "").replace(/`/g, "");
      const names = term.split(/\s+(?:and|\/)\s+|\s*\/\s*/).map((t) => t.trim().toLowerCase());
      const inDiagram = names.some((n) => n && fence.includes(n));
      if (!inDiagram) report(file, line, `footnote [^${id}] is defined but never referenced`, text);
      else if (Number(id) < highestRef) {
        report(file, line, `diagram-only footnote [^${id}] must come after the referenced ones`, text);
      }
    }
  }

  // Every public page is in the human map (LLMS.md, which is also /llms.txt), in sidebar order.
  // /llms-full.txt and the sitemap are generated from the same list, so they can't drift.
  const llms = docs.find((d) => d.route === "/LLMS.md");
  const order = (nodes) => nodes.flatMap((n) => (n.kind === "dir" ? order(n.children) : [n.route]));
  const sidebar = order(getTree());
  if (llms) {
    const listed = [...llms.source.matchAll(/^- `(\/[^`]+)`/gm)].map((m) => m[1]);
    for (const doc of getPublicDocs().filter((d) => d.route !== "/LLMS.md")) {
      if (!listed.includes(doc.route)) report(path.join(ROOT, "src/LLMS.md"), 0, `${doc.route} is missing from the map`);
    }
    checkOrder("src/LLMS.md", listed, sidebar);
  }

  // README's project list follows the PORTFOLIO/ order too.
  const readme = docs.find((d) => d.route === "/README.md");
  if (readme) {
    const linked = [...readme.source.matchAll(/^-\s*\[[^\]]+\]\((\/PORTFOLIO\/[^)]+)\)/gm)].map((m) => m[1]);
    checkOrder("src/README.md", linked, sidebar);
  }
}

function checkOrder(rel, listed, sidebar) {
  const common = listed.filter((r) => sidebar.includes(r));
  const expected = sidebar.filter((r) => common.includes(r));
  if (common.join() !== expected.join()) {
    report(path.join(ROOT, rel), 0, "pages are not in sidebar order", `expected ${expected.join(", ")}`);
  }
}

if (problems.length) {
  console.error(`check-content${BUILT ? " --built" : ""}: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(p);
  process.exit(1);
}
console.log(`check-content${BUILT ? " --built" : ""}: ok`);
