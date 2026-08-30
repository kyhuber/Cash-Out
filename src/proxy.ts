import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { optionalSupabaseConfig } from "@/lib/env";

/**
 * Next 16 renamed Middleware to Proxy; the behaviour is unchanged.
 *
 * This refreshes the Supabase session cookie on each request so server
 * components see a live session. It deliberately does NOT gate access — the
 * Next docs are explicit that proxy is not an authorization boundary, and
 * Postgres RLS is the real one. Pages still check the session themselves.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not configured yet (fresh clone, CI build) — pass the request through.
  const config = optionalSupabaseConfig();
  if (!config) return response;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching getUser() is what performs the refresh.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, images, and the PWA shell files.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
