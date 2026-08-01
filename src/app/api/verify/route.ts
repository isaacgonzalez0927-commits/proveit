import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanId } from "@/types";

/**
 * Server-side proof verification powered by OpenAI Vision.
 * The in-app proof flow (`/goals/submit`) and the optional AI widget POST here
 * with `{ imageBase64, goalTitle, goalDescription?, proofRequirement? }`.
 * Response shape: `{ verified: boolean, feedback: string }`.
 *
 * Feedback is shown in the Goal Garden as a Gardener's Note (24h).
 * This endpoint does NOT consume AI Coach weekly quota — that is `/api/ai-coach` only.
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
          .select("plan, strict_ai_verification")
          .eq("id", auth.user.id)
          .maybeSingle()
      : null;
    const plan = normalizePlanId(profile?.data?.plan);
    const strictMode =
      (plan === "pro" || plan === "premium") &&
      profile?.data?.strict_ai_verification === true;

    // 1. Optional custom AI relay (kept for integrations).
    if (customUrl) {
      const result = await verifyWithCustomAI(
        customUrl,
        imageBase64,
        goalTitle,
        goalDescription ?? "",
        proofRequirement ?? ""
      );
      return NextResponse.json(result);
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
      return NextResponse.json(result);
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
