import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const redirectTo = `${origin}${next}`;

  if (!code) {
    return NextResponse.redirect(redirectTo);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(redirectTo);
  }

  // Build the redirect response first so we can attach session cookies to it.
  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.headers.get("cookie")?.split("; ").map((c) => {
          const [name, ...v] = c.split("=");
          return { name, value: v.join("=").trim() };
        }) ?? [];
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Optionally redirect to login with error (for now just go home).
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  return response;
}
