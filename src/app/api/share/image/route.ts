import { NextRequest, NextResponse } from "next/server";

/** Same-origin proxy so collage share can paint Supabase proof images on canvas. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseBase) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const allowedHost = new URL(supabaseBase).host;
  const isSubmissionImage =
    target.host === allowedHost &&
    target.pathname.includes("/storage/v1/object/public/submission-images/");

  if (!isSubmissionImage) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const upstream = await fetch(target.toString());
  if (!upstream.ok) {
    return NextResponse.json({ error: "Could not load image." }, { status: 502 });
  }

  const bytes = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
