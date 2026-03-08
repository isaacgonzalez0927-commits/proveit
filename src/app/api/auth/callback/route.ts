import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const origin =
    forwardedHost && forwardedProto
      ? `${forwardedProto === "https" ? "https" : "http"}://${forwardedHost}`
      : url.origin;
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
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  return response;
}
