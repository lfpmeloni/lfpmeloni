"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/**
 * One delegated listener for Vercel Web Analytics custom events: outbound links (GitHub,
 * LinkedIn, email, project links) and glossary lookups. Custom events need a Pro plan; on
 * Hobby they are simply not recorded, and page views and referrers still are.
 */
export default function Track() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const page = location.pathname;
      if (a.classList.contains("t-fnref")) {
        track("glossary", { term: href.replace("#fn-", ""), page });
      } else if (/^(https?:|mailto:)/.test(href) && !href.startsWith(location.origin)) {
        track("outbound", { href, page });
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
