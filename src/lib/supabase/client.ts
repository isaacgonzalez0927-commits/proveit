"use client";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const { createBrowserClient } = await import("@supabase/ssr");
    return createBrowserClient(url, key);
  } catch {
    return null;
  }
}
