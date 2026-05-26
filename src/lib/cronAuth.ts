import { NextRequest, NextResponse } from "next/server";

export function assertCronAuthorized(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) return null;
  const auth = request.headers.get("authorization") ?? "";
  if (auth === `Bearer ${expected}`) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

