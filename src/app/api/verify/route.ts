import { NextRequest, NextResponse } from "next/server";

/**
 * Optional server-side verification (custom URL / OpenAI / demo).
 * The in-app proof flow (`/goals/submit`) uses **local browser CLIP** via Transformers.js
 * (`verifyWithLocalClip`); it does not call this route. Keep this for integrations or experiments.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, goalTitle, goalDescription, proofRequirement } = body as {
      imageBase64?: string;
      goalTitle: string;
      goalDescription?: string;
      proofRequirement?: string;
    };

    if (!goalTitle) {
      return NextResponse.json(
        { error: "goalTitle is required" },
        { status: 400 }
      );
    }

    const customUrl = process.env.CUSTOM_AI_VERIFY_URL;
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. Custom AI (your friend's API)
    if (customUrl && imageBase64) {
      const result = await verifyWithCustomAI(
        customUrl,
        imageBase64,
        goalTitle,
        goalDescription ?? "",
        proofRequirement ?? ""
      );
      return NextResponse.json(result);
    }

    // 2. OpenAI GPT-4 Vision
    if (openaiKey && imageBase64) {
      const result = await verifyWithOpenAI(
        openaiKey,
        imageBase64,
        goalTitle,
        goalDescription ?? "",
        proofRequirement ?? ""
      );
      return NextResponse.json(result);
    }

    // 3. Demo mode: simulate verification
    const simulated = simulateVerification(goalTitle, proofRequirement);
    return NextResponse.json(simulated);
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
  proofRequirement: string
) {
  const hasProof = Boolean(proofRequirement.trim());
  const prompt = hasProof
    ? `You are a strict but fair judge.

PRIMARY TASK: The user must submit a photo that satisfies this exact proof instruction:
"${proofRequirement.trim()}"

Use the goal title only as background (do not pass a photo that ignores the instruction just because it loosely fits the title):
Goal title: "${goalTitle}"${goalDescription ? ` — ${goalDescription}` : ""}

Look at the photo. Does it clearly satisfy the PROOF INSTRUCTION above? Consider:
- Is there a real person in the frame when the instruction implies one?
- Does the scene match what the instruction asks for, not just keywords from the title?

Respond with JSON only, no markdown:
{ "verified": true or false, "feedback": "One short sentence explaining why." }`
    : `You are a strict but fair judge. The user claims they did this goal: "${goalTitle}"${goalDescription ? ` (Details: ${goalDescription})` : ""}.

Look at the photo they submitted. Does the image clearly show the person doing or having completed this specific activity? Consider:
- Is there a real person in the frame (not a stock photo or meme)?
- Does the scene/activity match the stated goal?
- Could this be the same day / recent (e.g. gym, run, meal, reading)?

Respond with JSON only, no markdown:
{ "verified": true or false, "feedback": "One short sentence explaining why." }`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 200,
      messages: [
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

function simulateVerification(goalTitle: string, _proofRequirement?: string) {
  const pass = Math.random() > 0.25; // 75% pass in demo
  const feedbacksPass = [
    "Photo clearly shows you doing the activity. Goal verified!",
    "Scene matches your goal. Well done!",
    "Evidence looks good. Counts as done.",
  ];
  const feedbacksFail = [
    "The photo doesn't clearly show the activity. Try again with a clearer shot.",
    "We couldn't confirm this matches your goal. Please submit another photo.",
    "Image is unclear or doesn't match the goal. Give it another shot!",
  ];
  const list = pass ? feedbacksPass : feedbacksFail;
  const feedback = list[Math.floor(Math.random() * list.length)];
  return { verified: pass, feedback };
}
