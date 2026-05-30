import type { ReactNode } from "react";

interface BuddySectionProps {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function BuddySection({ id, title, description, children, className = "" }: BuddySectionProps) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      <div className="mb-3 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
