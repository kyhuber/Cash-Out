import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertNotAPrivilegedKey,
  normalizeSupabaseUrl,
  optionalSupabaseConfig,
  supabaseConfig,
} from "./env";

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

describe("config resolution", () => {
  afterEach(() => vi.unstubAllEnvs());

  function clear() {
    for (const k of [
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]) {
      vi.stubEnv(k, "");
    }
  }

  it("reads the server-only names", () => {
    clear();
    vi.stubEnv("SUPABASE_URL", "https://abcdefgh.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "key-1");
    expect(supabaseConfig()).toEqual({
      url: "https://abcdefgh.supabase.co",
      anonKey: "key-1",
    });
  });

  it("falls back to the NEXT_PUBLIC_ names so existing deployments keep working", () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefgh.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "key-2");
    expect(supabaseConfig()).toEqual({
      url: "https://abcdefgh.supabase.co",
      anonKey: "key-2",
    });
  });

  it("prefers the server-only name when both are set", () => {
    clear();
    vi.stubEnv("SUPABASE_URL", "https://server.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "server-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
    expect(supabaseConfig().url).toBe("https://server.supabase.co");
    expect(supabaseConfig().anonKey).toBe("server-key");
  });

  it("throws a useful message when nothing is set", () => {
    clear();
    expect(() => supabaseConfig()).toThrow(/Missing SUPABASE_URL/);
  });

  it("optionalSupabaseConfig yields null instead of throwing", () => {
    clear();
    expect(optionalSupabaseConfig()).toBeNull();

    vi.stubEnv("SUPABASE_URL", "https://supabase.com/dashboard/project/x");
    vi.stubEnv("SUPABASE_ANON_KEY", "k");
    expect(optionalSupabaseConfig()).toBeNull();
  });
});

function jwtWithRole(role: string) {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role })}.sig`;
}

describe("assertNotAPrivilegedKey", () => {
  it("accepts a publishable key", () => {
    expect(() =>
      assertNotAPrivilegedKey("sb_publishable_AbCdEf123456_XyZ"),
    ).not.toThrow();
  });

  it("accepts a legacy anon JWT", () => {
    expect(() => assertNotAPrivilegedKey(jwtWithRole("anon"))).not.toThrow();
  });

  it("rejects a secret key", () => {
    expect(() => assertNotAPrivilegedKey("sb_secret_DangerDanger")).toThrow(
      /SECRET key/,
    );
  });

  it("rejects a legacy service_role JWT", () => {
    expect(() => assertNotAPrivilegedKey(jwtWithRole("service_role"))).toThrow(
      /service_role/,
    );
  });

  it("does not choke on a key that merely contains dots", () => {
    expect(() => assertNotAPrivilegedKey("not.a.jwt")).not.toThrow();
  });
});

describe("publishable key naming", () => {
  afterEach(() => vi.unstubAllEnvs());

  function clear() {
    for (const k of [
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]) {
      vi.stubEnv(k, "");
    }
  }

  it("reads SUPABASE_PUBLISHABLE_KEY", () => {
    clear();
    vi.stubEnv("SUPABASE_URL", "https://abcdefgh.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_abc123");
    expect(supabaseConfig().anonKey).toBe("sb_publishable_abc123");
  });

  it("prefers the publishable name over the legacy anon name", () => {
    clear();
    vi.stubEnv("SUPABASE_URL", "https://abcdefgh.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_new");
    vi.stubEnv("SUPABASE_ANON_KEY", "legacy-anon");
    expect(supabaseConfig().anonKey).toBe("sb_publishable_new");
  });

  it("refuses to start with a secret key in the publishable slot", () => {
    clear();
    vi.stubEnv("SUPABASE_URL", "https://abcdefgh.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_secret_oops");
    expect(() => supabaseConfig()).toThrow(/SECRET key/);
    expect(optionalSupabaseConfig()).toBeNull();
  });
});
