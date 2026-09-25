import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Lumen Field")).toBe("Lumen Field");
    expect(csvCell(27.85)).toBe("27.85");
    expect(csvCell(null)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("Bar 309, north")).toBe('"Bar 309, north"');
    expect(csvCell('the "Moët" lounge')).toBe('"the ""Moët"" lounge"');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it("stops a cell from running as a spreadsheet formula", () => {
    // What a user dictates ends up here verbatim, so it can start with "=".
    expect(csvCell("=SUM(A1)")).toBe('"\t=SUM(A1)"');
    expect(csvCell("-5 cash")).toBe('"\t-5 cash"');
  });
});

describe("toCsv", () => {
  it("writes a header, CRLF rows and a byte-order mark", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('﻿a,b\r\n1,"x,y"\r\n');
  });
});
