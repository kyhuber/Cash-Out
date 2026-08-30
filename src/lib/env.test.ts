import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./env";

describe("normalizeSupabaseUrl", () => {
  it("accepts a well-formed project URL", () => {
    expect(normalizeSupabaseUrl("https://abcdefgh.supabase.co")).toBe(
      "https://abcdefgh.supabase.co",
    );
  });

  it("strips trailing slashes and surrounding whitespace", () => {
    expect(normalizeSupabaseUrl("  https://abcdefgh.supabase.co/  ")).toBe(
      "https://abcdefgh.supabase.co",
    );
    expect(normalizeSupabaseUrl("https://abcdefgh.supabase.co///")).toBe(
      "https://abcdefgh.supabase.co",
    );
  });

  it("rejects the dashboard URL, which is the usual mistake", () => {
    expect(() =>
      normalizeSupabaseUrl("https://supabase.com/dashboard/project/abcdefgh"),
    ).toThrow(/Project Settings/);
  });

  it("rejects a URL with any other path", () => {
    expect(() =>
      normalizeSupabaseUrl("https://abcdefgh.supabase.co/rest/v1"),
    ).toThrow(/no path/);
  });

  it("rejects junk", () => {
    expect(() => normalizeSupabaseUrl("abcdefgh.supabase.co")).toThrow(
      /not a valid URL/,
    );
    expect(() => normalizeSupabaseUrl("")).toThrow(/not a valid URL/);
  });

  it("allows http only for localhost", () => {
    expect(normalizeSupabaseUrl("http://localhost:54321")).toBe(
      "http://localhost:54321",
    );
    expect(() => normalizeSupabaseUrl("http://abcdefgh.supabase.co")).toThrow(
      /must use https/,
    );
  });
});
