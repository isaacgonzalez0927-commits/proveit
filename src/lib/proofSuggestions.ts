/**
 * Proof photo prompts for a goal title.
 * Wire your model with CUSTOM_AI_SUGGESTIONS_URL (server POST JSON { title }, JSON response — see extractSuggestionStringsFromJson).
 */

export const PROOF_SUGGESTIONS_MIN = 2;
export const PROOF_SUGGESTIONS_MAX = 3;

const NEST_KEYS = ["data", "result", "payload", "output", "body", "response"] as const;

/** Keys whose values are likely a string[] of prompts from common AI gateways. */
const ARRAY_KEY_HINT = /suggestions|prompts|ideas|photo|proof|options|hints/i;

/** Deterministic fallback when no custom URL is set or the upstream call fails. */
export function mockProofSuggestionsForTitle(title: string): string[] {
  const t = title.trim() || "this goal";
  return [
    `Show yourself actively doing: ${t}`,
    `Photo of your space, tools, or setup for: ${t}`,
    `Capture a mid-action moment for: ${t}`,
  ];
}

export function normalizeSuggestionList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (out.length < PROOF_SUGGESTIONS_MIN) return null;
  return out.slice(0, PROOF_SUGGESTIONS_MAX);
}

/**
 * Pull 2–3 proof strings from flexible JSON (OpenAI wrappers, nested `data`, alternate keys).
 * Export for unit tests.
 */
export function extractSuggestionStringsFromJson(data: unknown): string[] | null {
  if (data == null) return null;

  if (Array.isArray(data)) {
    if (data.every((x): x is string => typeof x === "string")) {
      return normalizeSuggestionList(data);
    }
    const fromObjects = data
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const o = item as Record<string, unknown>;
          for (const k of ["text", "prompt", "label", "title", "suggestion", "content", "message"]) {
            const v = o[k];
            if (typeof v === "string" && v.trim()) return v.trim();
          }
        }
        return "";
      })
      .filter(Boolean);
    return normalizeSuggestionList(fromObjects);
  }

  if (typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  for (const [k, v] of Object.entries(o)) {
    if (!ARRAY_KEY_HINT.test(k)) continue;
    const list = normalizeSuggestionList(v);
    if (list) return list;
  }

  for (const nest of NEST_KEYS) {
    const inner = o[nest];
    if (inner && typeof inner === "object") {
      const list = extractSuggestionStringsFromJson(inner);
      if (list) return list;
    }
  }

  const choices = o.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const content = (choices[0] as { message?: { content?: unknown } }).message?.content;
    if (typeof content === "string") {
      try {
        return extractSuggestionStringsFromJson(JSON.parse(content) as unknown);
      } catch {
        return null;
      }
    }
  }

  return null;
}

function resolveCustomSuggestionsUrl(): string | undefined {
  const candidates = [
    process.env.CUSTOM_AI_SUGGESTIONS_URL,
    process.env.CUSTOM_AI_GOAL_SUGGESTIONS_URL,
    process.env.AI_PROOF_SUGGESTIONS_URL,
  ];
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return undefined;
}

/**
 * Server-only: call external AI or fall back to mock.
 * Env (first set wins): CUSTOM_AI_SUGGESTIONS_URL | CUSTOM_AI_GOAL_SUGGESTIONS_URL | AI_PROOF_SUGGESTIONS_URL
 * POST JSON { title, goalTitle } (same string) for compatibility with different backends.
 * Optional: CUSTOM_AI_SUGGESTIONS_API_KEY as Bearer token.
 */
export async function getProofSuggestionsForTitle(title: string): Promise<string[]> {
  const trimmed = title.trim();
  if (!trimmed) return mockProofSuggestionsForTitle("your goal");

  const url = resolveCustomSuggestionsUrl();
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
      body: JSON.stringify({ title: trimmed, goalTitle: trimmed }),
    });

    if (!res.ok) {
      console.warn("[proofSuggestions] Custom AI HTTP", res.status, await res.text().catch(() => ""));
      return mockProofSuggestionsForTitle(trimmed);
    }

    const data: unknown = await res.json().catch(() => null);
    const list = extractSuggestionStringsFromJson(data);
    if (list) return list;

    console.warn(
      "[proofSuggestions] Custom AI JSON had no usable prompt list (expected suggestions[], prompts[], nested data.*, etc.). Keys:",
      data && typeof data === "object" ? Object.keys(data as object).join(", ") : typeof data
    );
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

/** At least 2 non-empty strings; trimmed to max 3 for API and client validation. */
export function parseProofSuggestionsPayload(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const arr = raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (arr.length < PROOF_SUGGESTIONS_MIN) return null;
  return arr.slice(0, PROOF_SUGGESTIONS_MAX);
}

export function isValidProofBundle(proofSuggestions: unknown, proofRequirement: unknown): boolean {
  const list = parseProofSuggestionsPayload(proofSuggestions);
  if (!list) return false;
  const req = typeof proofRequirement === "string" ? proofRequirement.trim() : "";
  return isProofRequirementAllowed(req, list);
}
