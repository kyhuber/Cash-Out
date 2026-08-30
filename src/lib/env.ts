/**
 * Reads and validates public Supabase config. Resolved lazily (not at module
 * load) so `next build` succeeds in an environment without them configured.
 */
export function supabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in your Supabase project values.",
    );
  }

  return { url: normalizeSupabaseUrl(rawUrl), anonKey };
}

/**
 * Supabase's own error for a malformed base URL is "Invalid path specified in
 * request URL", which gives no hint that the environment variable is at fault.
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
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${rawUrl}". ` +
        "It should look like https://your-project-ref.supabase.co",
    );
  }

  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL must use https, got "${parsed.protocol}//".`,
    );
  }

  if (parsed.pathname !== "/") {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL should be your project's base URL with no path, ` +
        `but it has one: "${parsed.pathname}". ` +
        "The dashboard address (https://supabase.com/dashboard/project/...) is a " +
        "different thing — copy the Project URL from Project Settings → Data API, " +
        "which looks like https://your-project-ref.supabase.co",
    );
  }

  return trimmed;
}
