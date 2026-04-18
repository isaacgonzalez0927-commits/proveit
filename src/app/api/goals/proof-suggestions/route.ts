import { NextRequest, NextResponse } from "next/server";
import { getProofSuggestionsForTitle } from "@/lib/proofSuggestions";

/**
 * POST { title: string } → { suggestions: string[] }
 * No auth required — only derives generic photo prompts from the title (no user data).
 * Keeps goal creation from failing when session cookies are missing on a single fetch.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: "Enter a goal title (at least 2 characters) first." },
        { status: 400 }
      );
    }

    const { suggestions } = await getProofSuggestionsForTitle(title);
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("proof-suggestions route:", e);
    return NextResponse.json({ error: "Could not load suggestions." }, { status: 500 });
  }
}
