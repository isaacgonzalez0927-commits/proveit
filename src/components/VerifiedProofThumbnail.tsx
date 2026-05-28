import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

interface VerifiedProofThumbnailProps {
  href: string;
  src: string;
  ariaLabel: string;
  className?: string;
}

export function VerifiedProofThumbnail({
  href,
  src,
  ariaLabel,
  className = "",
}: VerifiedProofThumbnailProps) {
  return (
    <Link
      href={href}
      className={`relative block h-12 w-12 shrink-0 ${className}`}
      aria-label={ariaLabel}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full rounded-xl object-cover ring-2 ring-prove-400/90 dark:ring-prove-500/70"
      />
      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-prove-500 shadow-sm ring-2 ring-white dark:bg-prove-600 dark:ring-slate-900">
        <CheckCircle2 className="h-3.5 w-3.5 text-white" aria-hidden />
      </span>
    </Link>
  );
}
