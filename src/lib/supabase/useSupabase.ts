"use client";

export function useSupabaseConfigured(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
