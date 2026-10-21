"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Doc, TreeNode } from "@/lib/content";
import { EMAIL, EMAIL_LIVE, GITHUB, LINKEDIN } from "@/lib/site";

/** Glyphs come from Hack Nerd Font Mono (self-hosted in public/fonts). */
const GITHUB_LINK = { icon: "\uf09b", label: "GitHub", href: GITHUB };
const LINKEDIN_LINK = { icon: "\uf0e1", label: "LinkedIn", href: LINKEDIN };
const EMAIL_LINK = { icon: "\uf0e0", label: EMAIL, href: `mailto:${EMAIL}` };

/** Until the mailbox is live, LinkedIn is the primary contact and email stays out of the header. */
const LINKS = EMAIL_LIVE ? [GITHUB_LINK, LINKEDIN_LINK, EMAIL_LINK] : [LINKEDIN_LINK, GITHUB_LINK];

type Theme = "dark" | "light";

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      className="chip icon-only theme-toggle"
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to night mode" : "Switch to day mode"}
      title={theme === "light" ? "night mode" : "day mode"}
    >
      <span className="glyph" aria-hidden="true">
        {theme === "light" ? "\uf186" : "\uf185"}
      </span>
    </button>
  );
}

/** "/" is README.md; everything else is its own path. */
function crumbsFor(pathname: string): string[] {
  const parts = decodeURIComponent(pathname).split("/").filter(Boolean);
  if (parts.length === 0) return ["README.md"];
  if (!parts[parts.length - 1].includes(".")) parts[parts.length - 1] += "/";
  return parts;
}

function isActive(pathname: string, route: string) {
  const here = decodeURIComponent(pathname).toLowerCase();
  const there = route.toLowerCase();
  return here === there || (here === "/" && there === "/readme.md");
}

function Tree({ nodes, pathname, depth = 0 }: { nodes: TreeNode[]; pathname: string; depth?: number }) {
  return (
    <ul className="tree" style={{ paddingLeft: depth === 0 ? 0 : "1.1rem" }}>
      {nodes.map((node) =>
        node.kind === "dir" ? (
          <li key={node.label}>
            <span className="tree-dir">{node.label}/</span>
            <Tree nodes={node.children} pathname={pathname} depth={depth + 1} />
          </li>
        ) : (
          <li key={node.route}>
            <Link
              href={node.route}
              className={`tree-file${isActive(pathname, node.route) ? " active" : ""}`}
            >
              {node.label}
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}

export default function Shell({
  tree,
  footnotes,
  children,
}: {
  tree: TreeNode[];
  footnotes: Pick<Doc, "name" | "route">[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const crumbs = crumbsFor(pathname);

  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the mobile file browser and hands focus back to the button that opened it.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      burger.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="top">
        <div className="top-left">
          <button
            ref={burger}
            className="burger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle file browser"
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          </button>
          <Link href="/" className="brand">
            lfpmeloni.dev/
          </Link>
          <span className="top-path">
            {crumbs.map((c, i) =>
              i === crumbs.length - 1 ? (
                <span key={c + i} className="top-file">
                  {c}
                </span>
              ) : (
                <span key={c + i} className="top-dir">
                  {c}/
                </span>
              ),
            )}
          </span>
        </div>
        <Link href="/" className="who">
          Felipe Meloni
        </Link>
        <div className="top-right">
          <nav className="top-links">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="chip"
                target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer noopener"
                aria-label={l.label}
              >
                <span className="glyph" aria-hidden="true">
                  {l.icon}
                </span>
                <span className="chip-label">{l.label}</span>
              </a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <div className="body">
        <aside className={`sidebar${open ? " open" : ""}`}>
          <div className="sidebar-inner">
            <Link href="/" className="root-line">
              lfpmeloni.dev/
            </Link>
            <Tree nodes={tree} pathname={pathname} />
            <div className="sidebar-foot">
              {footnotes.map((f) => (
                <Link key={f.route} href={f.route} className="foot-link">
                  {f.name}
                </Link>
              ))}
              <a
                href={LINKEDIN}
                className="foot-link"
                target="_blank"
                rel="noreferrer noopener"
              >
                LinkedIn
              </a>
              <span className="copyright" suppressHydrationWarning>© {new Date().getFullYear()} Felipe Meloni</span>
            </div>
          </div>
        </aside>
        {children}
      </div>
    </>
  );
}
