import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanId } from "@/types";
import {
  getAiVerificationCycleKind,
  getAiVerificationLimit,
} from "@/lib/subscriptionLimits";

/**
 * Server-side proof verification powered by OpenAI Vision.
 * The in-app proof flow (`/goals/submit`) and the optional AI widget POST here
 * with `{ imageBase64, goalTitle, goalDescription?, proofRequirement? }`.
 * Response shape: `{ verified: boolean, feedback: string }`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, goalTitle, goalDescription, proofRequirement } = body as {
      imageBase64?: string;
      goalTitle?: string;
      goalDescription?: string;
      proofRequirement?: string;
    };

    if (!goalTitle || !goalTitle.trim()) {
      return NextResponse.json(
        { verified: false, feedback: "Missing goal." },
        { status: 400 }
      );
    }
    if (!imageBase64) {
      return NextResponse.json(
        { verified: false, feedback: "Missing photo. Try retaking it." },
        { status: 400 }
      );
    }

    const customUrl = process.env.CUSTOM_AI_VERIFY_URL;
    const openaiKey = process.env.OPENAI_API_KEY;

    const supabase = await createClient();
    const { data: auth } = supabase
      ? await supabase.auth.getUser()
      : { data: { user: null } };
    const profile = auth.user && supabase
      ? await supabase
          .from("profiles")
          .select("plan, strict_ai_verification, ai_verification_cycle_key, ai_verification_count")
          .eq("id", auth.user.id)
          .maybeSingle()
      : null;
    const plan = normalizePlanId(profile?.data?.plan);
    const planContext = { plan };
    const strictMode =
      (plan === "pro" || plan === "premium") &&
      profile?.data?.strict_ai_verification === true;
    const usage = checkAiUsage({
      planContext,
      cycleKey: typeof profile?.data?.ai_verification_cycle_key === "string"
        ? profile.data.ai_verification_cycle_key
        : null,
      count: typeof profile?.data?.ai_verification_count === "number"
        ? profile.data.ai_verification_count
        : 0,
    });
    if (!usage.allowed) {
      return NextResponse.json(
        {
          verified: false,
          feedback: usage.plan === "free"
            ? `You used your ${usage.limit} free AI check${usage.limit === 1 ? "" : "s"} for this ${usage.cycleLabel}. Your checks reset next ${usage.resetLabel}, or upgrade for Strict AI, more checks, and Streak Shields.`
            : `You used your ${usage.limit} AI checks for this ${usage.cycleLabel}. Your checks reset next ${usage.resetLabel}.`,
          aiLimitReached: true,
          aiUsage: { limit: usage.limit, used: usage.used, cycle: usage.cycleLabel },
        },
        { status: 429 }
      );
    }

    // 1. Optional custom AI relay (kept for integrations).
    if (customUrl) {
      const result = await verifyWithCustomAI(
        customUrl,
        imageBase64,
        goalTitle,
        goalDescription ?? "",
        proofRequirement ?? ""
      );
      await recordAiUsage(supabase, auth.user?.id, usage.nextCycleKey, usage.used + 1);
      return NextResponse.json({ ...result, aiUsage: { used: usage.used + 1, limit: usage.limit } });
    }

    // 2. Primary path: OpenAI GPT-4o-mini Vision.
    if (openaiKey) {
      const result = await verifyWithOpenAI(
        openaiKey,
        imageBase64,
        goalTitle,
        goalDescription ?? "",
        proofRequirement ?? "",
        { plan, strictMode }
      );
      await recordAiUsage(supabase, auth.user?.id, usage.nextCycleKey, usage.used + 1);
      return NextResponse.json({ ...result, aiUsage: { used: usage.used + 1, limit: usage.limit } });
    }

    // 3. No key configured — fail closed with a clear message instead of fake verdicts.
    return NextResponse.json(
      {
        verified: false,
        feedback:
          "AI verification is not configured. Set OPENAI_API_KEY in the server environment.",
      },
      { status: 503 }
    );
  } catch (e) {
    console.error("Verify API error:", e);
    return NextResponse.json(
      { verified: false, feedback: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}

function aiCycleKey(date: Date, kind: "week" | "month"): string {
  if (kind === "month") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const weekStart = new Date(date);
  weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return `${weekStart.getUTCFullYear()}-W${String(Math.ceil((weekStart.getTime() - Date.UTC(weekStart.getUTCFullYear(), 0, 1)) / 604800000) + 1).padStart(2, "0")}`;
}

function checkAiUsage(args: {
  planContext: { plan: "free" | "pro" | "premium" };
  cycleKey: string | null;
  count: number;
}) {
  const kind = getAiVerificationCycleKind(args.planContext);
  const nextCycleKey = aiCycleKey(new Date(), kind);
  const used = args.cycleKey === nextCycleKey ? Math.max(0, args.count) : 0;
  const limit = getAiVerificationLimit(args.planContext);
  return {
    allowed: used < limit,
    used,
    limit,
    nextCycleKey,
    cycleLabel: kind === "week" ? "week" : "month",
    resetLabel: kind === "week" ? "Monday" : "billing cycle",
    plan: args.planContext.plan,
  };
}

async function recordAiUsage(
  supabase: Awaited<ReturnType<typeof createClient>> | null,
  userId: string | undefined,
  cycleKey: string,
  nextCount: number
) {
  if (!supabase || !userId) return;
  await supabase
    .from("profiles")
    .update({
      ai_verification_cycle_key: cycleKey,
      ai_verification_count: nextCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
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
  const sharedPersonRules = `STEP 1 — Decide silently whether this goal requires a visible person in the photo:
- REQUIRES a person: action goals where the act itself is the proof (e.g. "go on a walk", "go to the gym", "run", "do push-ups", "meditate", "shower"). For these, a photo of just an object is NOT enough.
- DOES NOT require a person: object/state goals where the photo can prove the activity without showing the user (e.g. "read a book" → photo of an open book; "make the bed" → photo of a made bed; "do the dishes" → photo of clean dishes; "drink water" → photo of a water bottle being used; "journal" → photo of a journal page).
- Use common sense for ambiguous cases. If a person is clearly required and there is none, mark not verified.

STEP 2 — Judge the photo:
- If the goal requires a person, check that a real person (or at least their hands/body) is visible doing the activity, not a stock photo or meme.
- If the goal does NOT require a person, just check that the depicted object/scene clearly matches the goal.
- The scene must match the stated goal, not just share keywords. (E.g. a photo of a treadmill at a store is NOT proof of "go to the gym".)
- Memes, screenshots, drawings, and reused stock photos do NOT count as proof.`;
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

${sharedPersonRules}
${strictRules}

Respond with JSON only, no markdown:
{ "verified": true or false, "feedback": "One short sentence explaining why." }`
    : `You are a strict but fair judge for a goal-tracking app.

The user claims they did this goal: "${goalTitle}"${goalDescription ? ` (Details: ${goalDescription})` : ""}.

${sharedPersonRules}
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
  const content =
    data.choices?.[0]?.message?.content?.trim() ?? "{}";
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

