"use client";

import { useEffect, useState } from "react";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function parse(text: string): { y: number; m: number } | null {
  const m = /^([A-Za-z]+) (\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  return month === -1 ? null : { y: Number(m[2]), m: month };
}

/** Inclusive month count, the way LinkedIn shows it: Sep 2020 - Sep 2024 is 4 yrs 1 mo. */
function format(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? "yr" : "yrs"}`);
  if (m) parts.push(`${m} ${m === 1 ? "mo" : "mos"}`);
  return parts.join(" ") || "1 mo";
}

/**
 * Inlay hint after a date range, like nvim virtual text: not part of the .md source.
 * "Present" ranges start from the build date and refresh on mount, so they never go stale.
 */
export default function Duration({ from, to, built }: { from: string; to: string; built: string }) {
  const [now, setNow] = useState(() => new Date(built));
  useEffect(() => setNow(new Date()), []);

  const start = parse(from);
  const end = to.toLowerCase() === "present" ? { y: now.getFullYear(), m: now.getMonth() } : parse(to);
  if (!start || !end) return null;
  const months = (end.y - start.y) * 12 + (end.m - start.m) + 1;
  if (months <= 0) return null;

  return (
    <span className="t-inlay">
      {` · ${format(months)}`}
    </span>
  );
}
