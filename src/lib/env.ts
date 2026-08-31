/**
 * Reads and validates Supabase config.
 *
 * Every Supabase call in this app happens on the server — server components and
 * server actions — so these are deliberately NOT `NEXT_PUBLIC_`. Nothing about
 * the connection reaches the browser bundle.
 *
 * Several names are accepted so an existing deployment keeps working while
 * Supabase migrates from the legacy `anon` key to the publishable key. They are
 * interchangeable: the publishable key carries the same low privileges, and the
 * client sends it in exactly the same headers.
 */
function readEnv() {
  // An empty or whitespace-only variable counts as unset, so a blank
  // SUPABASE_URL can't shadow a working NEXT_PUBLIC_SUPABASE_URL.
  const first = (...values: (string | undefined)[]) =>
    values.map((v) => v?.trim()).find((v) => v);

  return {
    url: first(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: first(
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.SUPABASE_ANON_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/**
 * Refuses a key that can bypass row-level security.
 *
 * In the current Supabase dashboard the secret key sits directly beside the
 * publishable one, and pasting the wrong one here would not fail loudly — it
 * would work, while silently disabling every RLS policy, so any signed-in user
 * would see everyone's shifts. That is the one guarantee this app cannot lose.
 */
export function assertNotAPrivilegedKey(key: string): void {
  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "That looks like a Supabase SECRET key (sb_secret_...). It bypasses " +
        "row-level security, which would expose every user's shifts to every " +
        "other user. Use the PUBLISHABLE key (sb_publishable_...) from " +
        "Project Settings → API Keys instead.",
    );
  }

  // Legacy service_role keys are JWTs carrying the role in their payload.
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      );
      if (payload?.role === "service_role") {
        throw new Error(
          "That is the legacy service_role key. It bypasses row-level " +
            "security, which would expose every user's shifts to every other " +
            "user. Use the publishable key (or the legacy anon key) instead.",
        );
      }
    } catch (e) {
      // Only re-throw our own error; a key that simply isn't a JWT is fine.
      if (e instanceof Error && e.message.includes("service_role")) throw e;
    }
  }
}

/** Throws a message worth reading if the config is missing or malformed. */
export function supabaseConfig() {
  const { url, anonKey } = readEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. " +
        "Copy .env.example to .env.local and fill in your Supabase project values.",
    );
  }

  assertNotAPrivilegedKey(anonKey);

  return { url: normalizeSupabaseUrl(url), anonKey };
}

/** Same, but yields null instead of throwing — for code that must not fail hard. */
export function optionalSupabaseConfig() {
  const { url, anonKey } = readEnv();
  if (!url || !anonKey) return null;

  try {
    assertNotAPrivilegedKey(anonKey);
    return { url: normalizeSupabaseUrl(url), anonKey };
  } catch {
    return null;
  }
}

/**
 * Supabase's own error for a malformed base URL is "Invalid path specified in
 * request URL", which gives no hint that an environment variable is at fault.
 * The usual cause is pasting the dashboard address instead of the project API
 * URL, so check for that here and say so plainly.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `SUPABASE_URL is not a valid URL: "${rawUrl}". ` +
        "It should look like https://your-project-ref.supabase.co",
    );
  }

  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error(`SUPABASE_URL must use https, got "${parsed.protocol}//".`);
  }

  if (parsed.pathname !== "/") {
    throw new Error(
      `SUPABASE_URL should be your project's base URL with no path, ` +
        `but it has one: "${parsed.pathname}". ` +
        "The dashboard address (https://supabase.com/dashboard/project/...) is a " +
        "different thing — copy the Project URL from Project Settings → Data API, " +
        "which looks like https://your-project-ref.supabase.co",
    );
  }

  return trimmed;
}
