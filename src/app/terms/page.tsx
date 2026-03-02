import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-[max(7rem,env(safe-area-inset-bottom))]">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
        Terms of Use
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Last updated: Feb 20, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Service purpose</h2>
          <p className="mt-2">
            ProveIt helps users track habits and goals through reminders and photo-based verification.
            ProveIt is provided as-is and may change over time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">User responsibilities</h2>
          <p className="mt-2">
            You are responsible for information and content you submit, including photos. Do not upload
            unlawful or harmful content.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Verification results</h2>
          <p className="mt-2">
            AI verification can be imperfect. Results are intended for habit-tracking support and are not
            guaranteed to be error-free.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Account termination</h2>
          <p className="mt-2">
            You can stop using ProveIt at any time and delete your account from the app settings.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Contact</h2>
          <p className="mt-2">
            For support or legal inquiries, contact:{" "}
            <a className="text-prove-600 hover:underline dark:text-prove-400" href="mailto:contact.proveit.app@gmail.com">
              contact.proveit.app@gmail.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 text-sm">
        <Link href="/privacy" className="text-prove-600 hover:underline dark:text-prove-400">
          Privacy Policy
        </Link>
        <Link href="/" className="text-prove-600 hover:underline dark:text-prove-400">
          Back to app
        </Link>
      </div>
    </main>
  );
}
