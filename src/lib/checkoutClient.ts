import type { PlanId } from "@/types";

export async function startStripeCheckout(
  plan: PlanId,
  billing: "monthly" | "yearly"
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, billing }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.ok && typeof data.url === "string") {
    return { ok: true, url: data.url };
  }
  return {
    ok: false,
    error: typeof data.error === "string" ? data.error : "Checkout is unavailable right now.",
  };
}

export async function syncStripeSubscription(): Promise<
  { ok: true; plan: string; billing: string } | { ok: false; error: string }
> {
  const res = await fetch("/api/stripe/sync-subscription", {
    method: "POST",
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    plan?: string;
    billing?: string;
    error?: string;
  };
  if (res.ok && data.ok && typeof data.plan === "string") {
    return {
      ok: true,
      plan: data.plan,
      billing: typeof data.billing === "string" ? data.billing : "monthly",
    };
  }
  return {
    ok: false,
    error: typeof data.error === "string" ? data.error : "Could not sync subscription.",
  };
}

export async function openStripeBillingPortal(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.ok && typeof data.url === "string") {
    return { ok: true, url: data.url };
  }
  return {
    ok: false,
    error: typeof data.error === "string" ? data.error : "Billing portal is unavailable.",
  };
}
