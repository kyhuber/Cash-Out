/**
 * A CSV cell, quoted only when it has to be. RFC 4180: a field containing a
 * comma, quote or line break is wrapped in quotes, with quotes doubled.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "number" ? String(value) : value;
  // A leading =, +, - or @ makes a spreadsheet run the cell as a formula.
  // A tab in front stops that without changing how the text reads.
  const guarded = /^[=+\-@]/.test(s) ? `\t${s}` : s;
  return /[",\r\n\t]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/** Rows to CSV text, header first, CRLF line endings, with a BOM so Excel reads UTF-8. */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
