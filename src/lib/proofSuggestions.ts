/**
 * Proof photo prompts for a goal title.
 * Replace mock with your AI by setting CUSTOM_AI_SUGGESTIONS_URL (server-side POST JSON { title }, expect { suggestions: string[] }).
 */

export const PROOF_SUGGESTIONS_MIN = 2;
export const PROOF_SUGGESTIONS_MAX = 3;

/** Deterministic placeholder until your model is wired in. */
export function mockProofSuggestionsForTitle(title: string): string[] {
  const t = title.trim() || "this goal";
  return [
    `Take a selfie or photo that clearly shows you doing: ${t}`,
    `Take a picture of your environment, tools, or setup related to: ${t}`,
    `Take a photo of you in the middle of the activity for: ${t}`,
  ];
}

function normalizeSuggestionList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (out.length < PROOF_SUGGESTIONS_MIN) return null;
  return out.slice(0, PROOF_SUGGESTIONS_MAX);
}

/**
 * Server-only: call external AI or fall back to mock.
 * Env: CUSTOM_AI_SUGGESTIONS_URL — POST { "title": string }, JSON { "suggestions": string[] } (2–3 items).
 * Optional: CUSTOM_AI_SUGGESTIONS_API_KEY as Bearer token.
 */
export async function getProofSuggestionsForTitle(title: string): Promise<string[]> {
  const trimmed = title.trim();
  if (!trimmed) return mockProofSuggestionsForTitle("your goal");

  const url = process.env.CUSTOM_AI_SUGGESTIONS_URL?.trim();
  if (!url) {
    return mockProofSuggestionsForTitle(trimmed);
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = process.env.CUSTOM_AI_SUGGESTIONS_API_KEY?.trim();
    if (key) headers.Authorization = `Bearer ${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: trimmed }),
    });

    if (!res.ok) {
      console.warn("[proofSuggestions] Custom AI HTTP", res.status, await res.text().catch(() => ""));
      return mockProofSuggestionsForTitle(trimmed);
    }

    const data = (await res.json()) as { suggestions?: unknown };
    const list = normalizeSuggestionList(data.suggestions);
    if (list) return list;
  } catch (e) {
    console.warn("[proofSuggestions] Custom AI error, using mock:", e);
  }

  return mockProofSuggestionsForTitle(trimmed);
}

export function isProofRequirementAllowed(
  requirement: string | undefined,
  suggestions: string[] | undefined
): boolean {
  if (!requirement?.trim() || !suggestions?.length) return false;
  const r = requirement.trim();
  return suggestions.some((s) => s.trim() === r);
}
