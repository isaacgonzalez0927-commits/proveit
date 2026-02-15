import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const { updateSession } = await import("@/lib/supabase/middleware");
    if (typeof updateSession === "function") {
      return await updateSession(request);
    }
  } catch {
    // Supabase middleware missing or failed
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
