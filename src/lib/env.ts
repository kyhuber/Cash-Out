/**
 * Reads and validates Supabase config.
 *
 * Every Supabase call in this app happens on the server — server components and
 * server actions — so these are deliberately NOT `NEXT_PUBLIC_`. Nothing about
 * the connection reaches the browser bundle.
 *
 * The `NEXT_PUBLIC_` names are still accepted as a fallback so an existing
 * deployment keeps working. If browser-side Supabase is ever needed (realtime,
 * say), the prefixed names become required again for that code path.
 */
function readEnv() {
  // An empty or whitespace-only variable counts as unset, so a blank
  // SUPABASE_URL can't shadow a working NEXT_PUBLIC_SUPABASE_URL.
  const first = (...values: (string | undefined)[]) =>
    values.map((v) => v?.trim()).find((v) => v);

  return {
    url: first(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: first(
      process.env.SUPABASE_ANON_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/** Throws a message worth reading if the config is missing or malformed. */
export function supabaseConfig() {
  const { url, anonKey } = readEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in your Supabase project values.",
    );
  }

  return { url: normalizeSupabaseUrl(url), anonKey };
}

/** Same, but yields null instead of throwing — for code that must not fail hard. */
export function optionalSupabaseConfig() {
  const { url, anonKey } = readEnv();
  if (!url || !anonKey) return null;

  try {
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
