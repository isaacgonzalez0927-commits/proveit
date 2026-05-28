"use client";

import { useState } from "react";
import type { WeeklyCollage } from "@/lib/weeklyCollage";
import { collageShareFilename, renderCollageShareImage } from "@/lib/shareCollageImage";
import type { ShareGardenPlant } from "@/lib/shareGardenSnapshot";
import { shareOrDownloadBlob } from "@/lib/shareImage";
import { ShareImageButton } from "@/components/ShareImageButton";

interface WeeklyCollageCardProps {
  collage: WeeklyCollage;
  compact?: boolean;
  showShare?: boolean;
  gardenPlants?: ShareGardenPlant[];
}

export function WeeklyCollageCard({
  collage,
  compact = false,
  showShare = true,
  gardenPlants = [],
}: WeeklyCollageCardProps) {
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const displayPhotos = collage.photos.slice(0, compact ? 4 : 9);
  const overflow = collage.photos.length - displayPhotos.length;
  const gridClass = compact
    ? "grid grid-cols-2 gap-1.5"
    : "grid grid-cols-3 gap-1.5 sm:gap-2";

  const handleShare = async () => {
    const blob = await renderCollageShareImage(collage, gardenPlants);
    return shareOrDownloadBlob(
      blob,
      collageShareFilename(collage),
      "Proveit weekly collage",
      `My proof collage for ${collage.label}`
    );
  };

  return (
    <article className="overflow-hidden rounded-2xl glass-card">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-prove-600 dark:text-prove-400">
            Weekly collage
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {collage.label}
          </h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-prove-100 px-2.5 py-1 text-xs font-bold text-prove-700 dark:bg-prove-950 dark:text-prove-300">
            {collage.proofCount} proof{collage.proofCount === 1 ? "" : "s"}
          </span>
          {showShare && collage.photos.length > 0 && (
            <ShareImageButton
              compact
              onShare={handleShare}
              onDone={(result) =>
                setShareNotice(result === "shared" ? "Shared!" : "Saved to your device.")
              }
              onError={setShareNotice}
            />
          )}
        </div>
      </div>
      <div className={`${gridClass} p-3`}>
        {displayPhotos.map((photo) => (
          <div
            key={photo.submissionId}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800"
          >
            <img
              src={photo.imageDataUrl}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[10px] font-medium text-white">
              {photo.goalTitle}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-900/80 text-sm font-semibold text-white dark:bg-slate-950/90">
            +{overflow}
          </div>
        )}
      </div>
      {(shareNotice || (!compact && collage.photos.length > 0)) && (
        <p className="border-t border-slate-200/70 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
          {shareNotice ||
            `${collage.proofCount} photo${collage.proofCount === 1 ? "" : "s"} from this week`}
        </p>
      )}
    </article>
  );
}
