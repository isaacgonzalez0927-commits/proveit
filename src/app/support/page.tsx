import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-[max(7rem,env(safe-area-inset-bottom))]">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
        Support
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Get help with ProveIt.
      </p>

      <div className="mt-8 space-y-6 text-sm text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Contact</h2>
          <p className="mt-1">
            For support, feedback, or account issues, email:{" "}
            <a
              href="mailto:proveit-app@googlegroups.com"
              className="text-prove-600 hover:underline dark:text-prove-400"
            >
              proveit-app@googlegroups.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Helpful links</h2>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/privacy" className="text-prove-600 hover:underline dark:text-prove-400">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-prove-600 hover:underline dark:text-prove-400">
                Terms of Use
              </Link>
            </li>
            <li>
              <Link href="/settings" className="text-prove-600 hover:underline dark:text-prove-400">
                Settings
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Account deletion</h2>
          <p className="mt-1">
            You can delete your account and all associated data at any time from{" "}
            <Link href="/settings" className="text-prove-600 hover:underline dark:text-prove-400">
              Settings
            </Link>
            {" "}→ Delete account.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="text-sm text-prove-600 hover:underline dark:text-prove-400"
        >
          Back to app
        </Link>
      </div>
    </main>
  );
}
