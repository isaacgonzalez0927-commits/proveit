import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanId } from "@/types";
import { consumeAiCoachUse } from "@/lib/aiCoachUsage";

type GoalContext = {
  title?: string;
  timesPerWeek?: number;
  streak?: number;
  provedThisWeek?: number;
  description?: string;
};

/**
 * AI Coach — habit coaching advice (separate from photo verification / Gardener's Note).
 * Consumes one weekly UTC use (Pro 5 / Premium 20 / Free 0). Server-enforced here only.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      goal?: GoalContext | null;
      goalsSummary?: GoalContext[];
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 800) {
      return NextResponse.json(
        { error: "Ask a short coaching question (1–800 characters)." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Sign in to use AI Coach." }, { status: 401 });
    }

    const profile = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", auth.user.id)
      .maybeSingle();
    const plan = normalizePlanId(profile.data?.plan);

    const consume = await consumeAiCoachUse(supabase, auth.user.id, plan);
    if (!consume.ok && consume.reason === "limit_reached") {
      return NextResponse.json(
        {
          error: consume.message,
          code: "AI_COACH_LIMIT",
          aiCoach: {
            used: consume.used,
            remaining: consume.remaining,
            limit: consume.limit,
            weekKey: consume.weekKey,
            timezone: "UTC" as const,
          },
        },
        { status: 429 }
      );
    }
    if (!consume.ok) {
      return NextResponse.json(
        {
          error: consume.message,
          code: "AI_COACH_ERROR",
          aiCoach: {
            used: consume.used,
            remaining: consume.remaining,
            limit: consume.limit,
            weekKey: consume.weekKey,
            timezone: "UTC" as const,
          },
        },
        { status: 500 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openaiKey) {
      return NextResponse.json(
        {
          error: "AI Coach is not configured. Set OPENAI_API_KEY on the server.",
          code: "AI_NOT_CONFIGURED",
          aiCoach: {
            used: consume.used,
            remaining: consume.remaining,
            limit: consume.limit,
            weekKey: consume.weekKey,
            timezone: "UTC" as const,
          },
        },
        { status: 503 }
      );
    }

    const reply = await generateCoachReply(openaiKey, message, body.goal ?? null, body.goalsSummary ?? []);

    return NextResponse.json({
      reply,
      aiCoach: {
        used: consume.used,
        remaining: consume.remaining,
        limit: consume.limit,
        weekKey: consume.weekKey,
        timezone: "UTC" as const,
      },
    });
  } catch (e) {
    console.error("AI Coach API error:", e);
    return NextResponse.json({ error: "AI Coach failed. Try again." }, { status: 500 });
  }
}

async function generateCoachReply(
  apiKey: string,
  message: string,
  goal: GoalContext | null,
  goalsSummary: GoalContext[]
): Promise<string> {
  const focus =
    goal?.title
      ? `Focus goal: "${goal.title}"${goal.description ? ` — ${goal.description}` : ""}. Target ${goal.timesPerWeek ?? "?"}×/week. Streak ${goal.streak ?? 0}. Proved this week: ${goal.provedThisWeek ?? 0}.`
      : goalsSummary.length > 0
        ? `User goals:\n${goalsSummary
            .slice(0, 8)
            .map(
              (g, i) =>
                `${i + 1}. "${g.title ?? "Goal"}" — ${g.timesPerWeek ?? "?"}×/week, streak ${g.streak ?? 0}, proved this week ${g.provedThisWeek ?? 0}`
            )
            .join("\n")}`
        : "No specific goal context provided.";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: `You are Proveit's AI Coach — a concise, motivating habit coach for a photo-proof goal garden app.
Rules:
- Give practical next steps (1–3 short bullets or a tight paragraph).
- Be encouraging but honest; no fluff or medical/legal advice.
- This is NOT photo verification and NOT a Gardener's Note — you coach behavior and planning.
- Keep replies under ~120 words.
- Reference the user's goals when context is given.`,
        },
        {
          role: "user",
          content: `${focus}\n\nUser question: ${message}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || "Keep showing up — one proof at a time. What's the smallest win you can lock in today?";
}
