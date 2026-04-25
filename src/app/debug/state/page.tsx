"use client";

/**
 * Diagnostic page that prints the live AppContext state so we can see whether
 * goals + submissions are actually in client memory after a proof submission.
 *
 * Visit `/debug/state` immediately after submitting a proof and compare the
 * counts/contents to the server state from `/api/debug/health`.
 */

import { useApp } from "@/context/AppContext";
import { format } from "date-fns";

export default function DebugStatePage() {
  const { user, goals, submissions } = useApp();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const verifiedToday = submissions.filter(
    (s) => s.status === "verified" && s.date === todayStr
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="mb-4 text-xl font-bold">Client state diagnostic</h1>

      <section className="mb-4 rounded-lg bg-white p-3 shadow dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Summary</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <strong>todayStr (local):</strong> {todayStr}
          </li>
          <li>
            <strong>user.id:</strong> {user?.id ?? "(no user)"}
          </li>
          <li>
            <strong>goals.length:</strong> {goals.length}
          </li>
          <li>
            <strong>submissions.length:</strong> {submissions.length}
          </li>
          <li>
            <strong>submissions verified today (status===&quot;verified&quot; &amp;&amp;
            date===todayStr):</strong>{" "}
            {verifiedToday.length}
          </li>
        </ul>
      </section>

      <section className="mb-4 rounded-lg bg-white p-3 shadow dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Goals (client memory)</h2>
        <pre className="overflow-x-auto text-xs">
          {JSON.stringify(
            goals.map((g) => ({
              id: g.id,
              title: g.title,
              frequency: g.frequency,
              timesPerWeek: g.timesPerWeek,
              completedDates: g.completedDates,
            })),
            null,
            2
          )}
        </pre>
      </section>

      <section className="mb-4 rounded-lg bg-white p-3 shadow dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Submissions (client memory)</h2>
        <pre className="overflow-x-auto text-xs">
          {JSON.stringify(
            submissions.map((s) => ({
              id: s.id,
              goalId: s.goalId,
              date: s.date,
              status: s.status,
              verifiedAt: s.verifiedAt,
              createdAt: s.createdAt,
            })),
            null,
            2
          )}
        </pre>
      </section>

      <section className="mb-4 rounded-lg bg-white p-3 shadow dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">localStorage snapshot</h2>
        <pre className="overflow-x-auto text-xs">
          {typeof window !== "undefined"
            ? window.localStorage.getItem("proveit_sb_session_snapshot_v1") ?? "(empty)"
            : ""}
        </pre>
      </section>
    </main>
  );
}
