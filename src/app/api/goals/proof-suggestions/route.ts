import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProofSuggestionsForTitle } from "@/lib/proofSuggestions";

/**
 * POST { title: string } → { suggestions: string[] }
 * Auth optional for UX (anonymous browse) — we only generate text from title.
 * If you need to hide this behind auth, add getUser() check.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: "Enter a goal title (at least 2 characters) first." },
        { status: 400 }
      );
    }

    const suggestions = await getProofSuggestionsForTitle(title);
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("proof-suggestions route:", e);
    return NextResponse.json({ error: "Could not load suggestions." }, { status: 500 });
  }
}
