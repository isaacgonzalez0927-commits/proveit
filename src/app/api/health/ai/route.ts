import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const customVerifyUrl = Boolean(process.env.CUSTOM_AI_VERIFY_URL?.trim());
  return NextResponse.json({
    openaiConfigured,
    customVerifyConfigured: customVerifyUrl,
    readyForAiVerification: openaiConfigured || customVerifyUrl,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    checkedAt: new Date().toISOString(),
  });
}
