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
