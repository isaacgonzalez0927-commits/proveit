/**
 * Proof photo prompts for a goal title.
 *
 * Priority: 1) CUSTOM_AI_SUGGESTIONS_URL (your API), 2) OPENAI_API_KEY (built-in OpenAI, no extra server),
 * 3) short local fallback lines.
 */

export const PROOF_SUGGESTIONS_MIN = 2;
export const PROOF_SUGGESTIONS_MAX = 3;

export type ProofSuggestionsSource = "custom" | "openai" | "mock";

export type ProofSuggestionsResult = {
  suggestions: string[];
  source: ProofSuggestionsSource;
};

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

/** Static env reads only — dynamic `process.env[k]` breaks in Next production builds. */
function resolveCustomSuggestionsUrl(): string | undefined {
  const a = process.env.CUSTOM_AI_SUGGESTIONS_URL?.trim();
  if (a) return a;
  const b = process.env.CUSTOM_AI_GOAL_SUGGESTIONS_URL?.trim();
  if (b) return b;
  const c = process.env.AI_PROOF_SUGGESTIONS_URL?.trim();
  if (c) return c;
  const typo = process.env.CUSTOM_AI_SUGGESTION_URL?.trim();
  if (typo) return typo;
  return undefined;
}

async function fetchOpenAiProofSuggestionsForTitle(goalTitle: string): Promise<string[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const system =
    "You help habit apps. Reply with one JSON object only, no markdown. Keys: suggestions (array of 2 or 3 short strings). Each string tells the user exactly what photo to take to prove they did the goal that day — concrete, verifiable, different angles (e.g. person in frame, environment, mid-action). No numbering inside strings.";

  const user = `Goal title: "${goalTitle}"\n\nReturn: {"suggestions":["...","...","..."]}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        temperature: 0.75,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.warn("[proofSuggestions] OpenAI HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(content) as unknown;
    } catch {
      return null;
    }
    return extractSuggestionStringsFromJson(parsed);
  } catch (e) {
    console.warn("[proofSuggestions] OpenAI error:", e);
    return null;
  }
}

/**
 * Server-only:
 * - If CUSTOM_AI_SUGGESTIONS_URL (or alias) is set → **only** that server is used for ideas; on failure we use
 *   placeholder lines (we do **not** fall back to OpenAI, so your API is never silently replaced).
 * - If no custom URL → OpenAI when OPENAI_API_KEY is set → else mock.
 * Custom: POST JSON { title, goalTitle }; optional CUSTOM_AI_SUGGESTIONS_API_KEY Bearer.
 */
export async function getProofSuggestionsForTitle(title: string): Promise<ProofSuggestionsResult> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { suggestions: mockProofSuggestionsForTitle("your goal"), source: "mock" };
  }

  const url = resolveCustomSuggestionsUrl();
  if (url) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const sugKey = process.env.CUSTOM_AI_SUGGESTIONS_API_KEY?.trim();
      if (sugKey) headers.Authorization = `Bearer ${sugKey}`;

      headers["User-Agent"] = "Proveit/1.0 (+proof-suggestions-server)";
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: trimmed, goalTitle: trimmed }),
        signal: AbortSignal.timeout(25_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(
          `[proofSuggestions] YOUR server (${url}) returned HTTP ${res.status}. Body (truncated): ${body.slice(0, 500)}. Fix the endpoint — OpenAI is NOT used when this URL is set.`
        );
      } else {
        const data: unknown = await res.json().catch(() => null);
        const list = extractSuggestionStringsFromJson(data);
        if (list) return { suggestions: list, source: "custom" };

        console.warn(
          "[proofSuggestions] YOUR server returned JSON we could not parse into 2–3 strings. Top-level keys:",
          data && typeof data === "object" ? Object.keys(data as object).join(", ") : typeof data,
          "— expected suggestions[], prompts[], ideas[], or nested data.* (see CUSTOM_AI.md). OpenAI is NOT used when CUSTOM_AI_SUGGESTIONS_URL is set."
        );
      }
    } catch (e) {
      console.warn(
        "[proofSuggestions] YOUR server fetch failed (network/DNS/TLS). OpenAI is NOT used when CUSTOM_AI_SUGGESTIONS_URL is set:",
        e
      );
    }

    return { suggestions: mockProofSuggestionsForTitle(trimmed), source: "mock" };
  }

  const openAi = await fetchOpenAiProofSuggestionsForTitle(trimmed);
  if (openAi) return { suggestions: openAi, source: "openai" };

  return { suggestions: mockProofSuggestionsForTitle(trimmed), source: "mock" };
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
