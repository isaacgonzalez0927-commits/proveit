import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanId } from "@/types";

export type VerifyGoalCandidate = {
  id: string;
  title: string;
  description?: string;
  proofRequirement?: string;
};

export type VerifyDenyReason = "no_connection" | "not_proven" | null;

/**
 * Server-side proof verification powered by OpenAI Vision.
 *
 * Single-goal (legacy / deep-link):
 *   { imageBase64, goalTitle, goalDescription?, proofRequirement? }
 *
 * Multi-goal match (FAB / no picker):
 *   { imageBase64, goals: VerifyGoalCandidate[] }
 *   → AI picks the best-connected goal, then judges whether the photo proves it.
 *   If no connection or connected-but-not-proven → verified: false.
 *
 * Optional lockGoalId with goals[] forces evaluation of that goal only
 * (client must not invent a goal the user doesn't own — server still matches by id).
 *
 * Response: { verified, feedback, matchedGoalId?, matchedGoalTitle?, denyReason? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageBase64,
      goalTitle,
      goalDescription,
      proofRequirement,
      goals: rawGoals,
      lockGoalId,
    } = body as {
      imageBase64?: string;
      goalTitle?: string;
      goalDescription?: string;
      proofRequirement?: string;
      goals?: VerifyGoalCandidate[];
      lockGoalId?: string;
    };

    if (!imageBase64) {
      return NextResponse.json(
        { verified: false, feedback: "Missing photo. Try retaking it.", denyReason: "no_connection" },
        { status: 400 }
      );
    }

    const goals = normalizeGoalCandidates(rawGoals);
    const locked =
      typeof lockGoalId === "string" && lockGoalId.trim()
        ? goals.find((g) => g.id === lockGoalId.trim())
        : null;

    const openaiKey = process.env.OPENAI_API_KEY;
    const customUrl = process.env.CUSTOM_AI_VERIFY_URL;

    const supabase = await createClient();
    const { data: auth } = supabase
      ? await supabase.auth.getUser()
      : { data: { user: null } };
    const profile =
      auth.user && supabase
        ? await supabase
            .from("profiles")
            .select("plan, strict_ai_verification")
            .eq("id", auth.user.id)
            .maybeSingle()
        : null;
    const plan = normalizePlanId(profile?.data?.plan);
    const strictMode =
      (plan === "pro" || plan === "premium") &&
      profile?.data?.strict_ai_verification === true;

    // Multi-goal match path (FAB flow) — do not trust a client-selected title alone.
    if (goals.length > 0) {
      const candidates = locked ? [locked] : goals;
      if (candidates.length === 0) {
        return NextResponse.json(
          {
            verified: false,
            feedback: "That goal isn’t available.",
            matchedGoalId: null,
            denyReason: "no_connection",
          },
          { status: 400 }
        );
      }

      if (customUrl) {
        const result = await matchWithCustomAI(customUrl, imageBase64, candidates);
        return NextResponse.json(result);
      }
      if (openaiKey) {
        const result = await matchWithOpenAI(openaiKey, imageBase64, candidates, {
          plan,
          strictMode,
        });
        return NextResponse.json(result);
      }
      return NextResponse.json(
        {
          verified: false,
          feedback:
            "AI verification is not configured. Set OPENAI_API_KEY in the server environment.",
          matchedGoalId: null,
          denyReason: "no_connection",
        },
        { status: 503 }
      );
    }

    // Legacy single-goal path (widget / older clients).
    if (!goalTitle || !goalTitle.trim()) {
      return NextResponse.json(
        {
          verified: false,
          feedback: "Missing goal.",
          matchedGoalId: null,
          denyReason: "no_connection",
        },
        { status: 400 }
      );
    }

    if (customUrl) {
      const result = await verifyWithCustomAI(
        customUrl,
        imageBase64,
        goalTitle,
        goalDescription ?? "",
        proofRequirement ?? ""
      );
      return NextResponse.json({
        ...result,
        matchedGoalId: null,
        matchedGoalTitle: goalTitle,
        denyReason: result.verified ? null : "not_proven",
      });
    }

    if (openaiKey) {
      const result = await verifyWithOpenAI(
        openaiKey,
        imageBase64,
        goalTitle,
        goalDescription ?? "",
        proofRequirement ?? "",
        { plan, strictMode }
      );
      return NextResponse.json({
        ...result,
        matchedGoalId: null,
        matchedGoalTitle: goalTitle,
        denyReason: result.verified ? null : "not_proven",
      });
    }

    return NextResponse.json(
      {
        verified: false,
        feedback:
          "AI verification is not configured. Set OPENAI_API_KEY in the server environment.",
        denyReason: "no_connection",
      },
      { status: 503 }
    );
  } catch (e) {
    console.error("Verify API error:", e);
    return NextResponse.json(
      {
        verified: false,
        feedback: "Verification failed. Please try again.",
        denyReason: "no_connection",
      },
      { status: 500 }
    );
  }
}

function normalizeGoalCandidates(raw: VerifyGoalCandidate[] | undefined): VerifyGoalCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => g && typeof g.id === "string" && typeof g.title === "string" && g.title.trim())
    .map((g) => ({
      id: g.id,
      title: g.title.trim(),
      description: typeof g.description === "string" ? g.description : "",
      proofRequirement: typeof g.proofRequirement === "string" ? g.proofRequirement : "",
    }))
    .slice(0, 24);
}

type MatchResult = {
  verified: boolean;
  feedback: string;
  matchedGoalId: string | null;
  matchedGoalTitle: string | null;
  denyReason: VerifyDenyReason;
};

async function matchWithOpenAI(
  apiKey: string,
  imageBase64: string,
  candidates: VerifyGoalCandidate[],
  options: { plan: "free" | "pro" | "premium"; strictMode: boolean }
): Promise<MatchResult> {
  const catalog = candidates
    .map((g, i) => {
      const proof = g.proofRequirement?.trim();
      const desc = g.description?.trim();
      return `${i + 1}. id="${g.id}" title="${g.title}"${desc ? ` details="${desc}"` : ""}${
        proof ? ` proof="${proof}"` : ""
      }`;
    })
    .join("\n");

  const strictRules = options.strictMode
    ? `

STRICT PAID MODE:
- Be extra skeptical of old/reused proof: reject screenshots, gallery-looking images, heavily edited images, or photos of another screen unless the goal explicitly involves screen work.
- Mention one concrete visual detail that supports or rejects the proof.`
    : `

STANDARD FREE MODE:
- Keep the check concise. Decide from the obvious visual evidence only.`;

  const prompt = `You are a strict but fair judge for a goal-tracking app.

The user did NOT pick a goal. Look at the photo and decide:

STEP 1 — CONNECTION: Which of the user's goals (if any) is this photo clearly about?
- Pick at most one goal id from the list.
- If the photo could belong to none of them (unrelated scene, meme, random screenshot), set matchedGoalId to null.

STEP 2 — PROOF: Only if a goal is connected, does the photo actually prove progress on that goal / satisfy its proof instruction?
- Connected but not proven (wrong activity, incomplete evidence, staged/unrelated) → verified false, denyReason "not_proven".
- No connection → verified false, denyReason "no_connection".
- Connected AND proven → verified true, denyReason null.

PHOTO RULES:
- A person in the photo is optional. Accept clear proof from objects, environments, results, or scenes.
- The image must plausibly match the stated goal or proof instruction — not just share a keyword.
- Reject memes, unrelated stock photos, random screenshots, drawings, and photos that could belong to any unrelated activity.
${strictRules}

USER GOALS:
${catalog}

Respond with JSON only, no markdown:
{
  "matchedGoalId": "exact id from the list or null",
  "verified": true or false,
  "denyReason": "no_connection" or "not_proven" or null,
  "feedback": "One short sentence explaining why."
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: options.strictMode ? 280 : 140,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict but fair photo judge for a goal-tracking app. Reply with JSON only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: options.strictMode ? "auto" : "low",
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() ?? "{}";
  let parsed: {
    verified?: boolean;
    feedback?: string;
    matchedGoalId?: string | null;
    denyReason?: string | null;
  };
  try {
    parsed = JSON.parse(content.replace(/^```\w*\n?|\n?```$/g, "").trim());
  } catch {
    parsed = {
      verified: false,
      feedback: "Could not parse verification result.",
      matchedGoalId: null,
      denyReason: "no_connection",
    };
  }

  return normalizeMatchResult(parsed, candidates);
}

function normalizeMatchResult(
  parsed: {
    verified?: boolean;
    feedback?: string;
    matchedGoalId?: string | null;
    denyReason?: string | null;
  },
  candidates: VerifyGoalCandidate[]
): MatchResult {
  const idRaw =
    typeof parsed.matchedGoalId === "string" && parsed.matchedGoalId.trim()
      ? parsed.matchedGoalId.trim()
      : null;
  const matched = idRaw ? candidates.find((g) => g.id === idRaw) ?? null : null;

  if (!matched) {
    return {
      verified: false,
      feedback:
        parsed.feedback?.trim() ||
        "This photo doesn’t connect to any of your goals. Try a clearer proof shot.",
      matchedGoalId: null,
      matchedGoalTitle: null,
      denyReason: "no_connection",
    };
  }

  const verified = Boolean(parsed.verified);
  if (!verified) {
    return {
      verified: false,
      feedback:
        parsed.feedback?.trim() ||
        `This looks related to "${matched.title}" but doesn’t prove it. Try another photo.`,
      matchedGoalId: matched.id,
      matchedGoalTitle: matched.title,
      denyReason: "not_proven",
    };
  }

  return {
    verified: true,
    feedback: parsed.feedback?.trim() || `Verified for "${matched.title}".`,
    matchedGoalId: matched.id,
    matchedGoalTitle: matched.title,
    denyReason: null,
  };
}

async function matchWithCustomAI(
  url: string,
  imageBase64: string,
  candidates: VerifyGoalCandidate[]
): Promise<MatchResult> {
  const apiKey = process.env.CUSTOM_AI_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      imageBase64,
      goals: candidates,
      mode: "match",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom AI error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    verified?: boolean;
    feedback?: string;
    matchedGoalId?: string | null;
    denyReason?: string | null;
  };
  return normalizeMatchResult(data, candidates);
}

async function verifyWithOpenAI(
  apiKey: string,
  imageBase64: string,
  goalTitle: string,
  goalDescription: string,
  proofRequirement: string,
  options: { plan: "free" | "pro" | "premium"; strictMode: boolean }
) {
  const hasProof = Boolean(proofRequirement.trim());
  const sharedPhotoRules = `PHOTO RULES:
- A person in the photo is optional. Accept clear proof from objects, environments, results, or scenes (e.g. an open book, a made bed, gym equipment, clean dishes, a journal page, a walking path, a water bottle).
- Hands or partial body in frame are fine but never required unless the proof instruction explicitly asks for them.
- The image must plausibly match the stated goal or proof instruction — not just share a keyword.
- Reject memes, unrelated stock photos, random screenshots, drawings, and photos that could belong to any unrelated activity.`;
  const strictRules = options.strictMode
    ? `

STRICT PAID MODE:
- Be extra skeptical of old/reused proof: reject screenshots, gallery-looking images, heavily edited images, or photos that appear to be of another screen unless the goal explicitly involves screen work.
- Mention one concrete visual detail that supports or rejects the proof.
- If the proof could be staged without showing the actual habit, reject it.`
    : `

STANDARD FREE MODE:
- Keep the check concise and cost-efficient. Decide from the obvious visual evidence only.`;

  const prompt = hasProof
    ? `You are a strict but fair judge for a goal-tracking app.

PRIMARY TASK: The user must submit a photo that satisfies this exact proof instruction:
"${proofRequirement.trim()}"

Goal title (background only, do not pass a photo that ignores the instruction just because it loosely matches the title):
"${goalTitle}"${goalDescription ? ` — ${goalDescription}` : ""}

${sharedPhotoRules}
${strictRules}

Respond with JSON only, no markdown:
{ "verified": true or false, "feedback": "One short sentence explaining why." }`
    : `You are a strict but fair judge for a goal-tracking app.

The user claims they did this goal: "${goalTitle}"${goalDescription ? ` (Details: ${goalDescription})` : ""}.

${sharedPhotoRules}
${strictRules}

Respond with JSON only, no markdown:
{ "verified": true or false, "feedback": "One short sentence explaining why." }`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: options.strictMode ? 240 : 90,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict but fair photo judge for a goal-tracking app. Reply with JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: options.strictMode ? "auto" : "low",
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() ?? "{}";
  let parsed: { verified?: boolean; feedback?: string };
  try {
    parsed = JSON.parse(content.replace(/^```\w*\n?|\n?```$/g, "").trim());
  } catch {
    parsed = { verified: false, feedback: "Could not parse verification result." };
  }
  return {
    verified: Boolean(parsed.verified),
    feedback: parsed.feedback ?? "No feedback provided.",
  };
}

/**
 * Call a custom AI API. Expects the endpoint to:
 * - Accept POST with JSON: { imageBase64, goalTitle, goalDescription, proofRequirement? }
 * - Return JSON: { verified: boolean, feedback: string }
 * Set CUSTOM_AI_VERIFY_URL and optionally CUSTOM_AI_API_KEY in .env.local
 */
async function verifyWithCustomAI(
  url: string,
  imageBase64: string,
  goalTitle: string,
  goalDescription: string,
  proofRequirement: string
) {
  const apiKey = process.env.CUSTOM_AI_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      imageBase64,
      goalTitle,
      goalDescription,
      proofRequirement,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom AI error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { verified?: boolean; feedback?: string };
  return {
    verified: Boolean(data.verified),
    feedback: data.feedback ?? "No feedback provided.",
  };
}
