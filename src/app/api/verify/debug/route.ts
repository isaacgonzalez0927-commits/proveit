import { NextResponse } from "next/server";

/**
 * Diagnostic: reports whether `OPENAI_API_KEY` is visible to the server runtime.
 * Never returns the actual secret — only presence + masked prefix/length so we can
 * confirm the deployed runtime sees the env var.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.OPENAI_API_KEY;
  const trimmed = raw?.trim() ?? "";
  const present = trimmed.length > 0;
  const looksLikeKey = trimmed.startsWith("sk-");
  return NextResponse.json({
    OPENAI_API_KEY_present: present,
    OPENAI_API_KEY_length: trimmed.length,
    OPENAI_API_KEY_prefix: present ? `${trimmed.slice(0, 6)}…` : null,
    OPENAI_API_KEY_looksLikeKey: looksLikeKey,
    CUSTOM_AI_VERIFY_URL_present: !!process.env.CUSTOM_AI_VERIFY_URL,
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
