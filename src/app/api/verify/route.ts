import { NextRequest, NextResponse } from "next/server";

/**
 * AI verification endpoint.
 * - With OPENAI_API_KEY: uses GPT-4 Vision to check if the image shows the goal being done.
 * - Without: returns a simulated result for demo (random pass/fail with plausible feedback).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, goalTitle, goalDescription } = body as {
      imageBase64?: string;
      goalTitle: string;
      goalDescription?: string;
    };

    if (!goalTitle) {
      return NextResponse.json(
        { error: "goalTitle is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && imageBase64) {
      const result = await verifyWithOpenAI(
        apiKey,
        imageBase64,
        goalTitle,
        goalDescription ?? ""
      );
      return NextResponse.json(result);
    }

    // Demo mode: simulate verification (slightly biased toward pass for better UX in demo)
    const simulated = simulateVerification(goalTitle);
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
  goalDescription: string
) {
  const prompt = `You are a strict but fair judge. The user claims they did this goal: "${goalTitle}"${goalDescription ? ` (Details: ${goalDescription})` : ""}.

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

function simulateVerification(goalTitle: string) {
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
