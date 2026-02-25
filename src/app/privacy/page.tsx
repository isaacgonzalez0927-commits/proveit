import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-[max(7rem,env(safe-area-inset-bottom))]">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Last updated: Feb 20, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">What ProveIt stores</h2>
          <p className="mt-2">
            ProveIt stores account details (email), goals, reminders, proof submissions, and verification
            results so the app can track your progress.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Photo proof data</h2>
          <p className="mt-2">
            When you submit proof, your image is used to verify the goal submission. Depending on your
            configuration, images and verification data may be processed by third-party services (for
            example, OpenAI or a custom verification endpoint).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notifications</h2>
          <p className="mt-2">
            ProveIt can schedule local reminder notifications. You can turn notification permissions on or
            off in your device settings at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Data deletion</h2>
          <p className="mt-2">
            You can request account deletion directly in the app from Settings. Deleting your account
            permanently removes your account data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Contact</h2>
          <p className="mt-2">
            For privacy questions, contact:{" "}
            <a className="text-prove-600 hover:underline dark:text-prove-400" href="mailto:proveit-app@googlegroups.com">
              proveit-app@googlegroups.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 text-sm">
        <Link href="/terms" className="text-prove-600 hover:underline dark:text-prove-400">
          Terms of Use
        </Link>
        <Link href="/" className="text-prove-600 hover:underline dark:text-prove-400">
          Back to app
        </Link>
      </div>
    </main>
  );
}
