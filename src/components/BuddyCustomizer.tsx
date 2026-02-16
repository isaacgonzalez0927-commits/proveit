"use client";

import { X } from "lucide-react";
import { BUDDY_ITEMS, type ItemSlot } from "@/lib/buddyItems";
import type { EquippedItems } from "@/lib/buddyItems";
import { BUDDY_ANIMALS, type BuddyAnimalId } from "@/lib/buddyAnimals";
import { BuddyIllustration } from "./BuddyIllustration";
import { HatIllustration, AccessoryIllustration } from "./BuddyItemIllustrations";

interface BuddyCustomizerProps {
  earnedItems: string[];
  equippedItems: EquippedItems;
  onSetEquipped: (slot: ItemSlot, itemId: string | null) => void;
  selectedAnimal: BuddyAnimalId;
  onSelectAnimal: (id: BuddyAnimalId) => void;
  onClose: () => void;
}

const SLOT_LABELS: Record<ItemSlot, string> = {
  hat: "Hats",
  accessory: "Accessories",
};

export function BuddyCustomizer({
  earnedItems,
  equippedItems,
  onSetEquipped,
  selectedAnimal,
  onSelectAnimal,
  onClose,
}: BuddyCustomizerProps) {
  const earnedSet = new Set(earnedItems);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 id="customizer-title" className="font-display font-semibold text-slate-900 dark:text-white">
            Customize your buddy
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Earn items by completing goals and building streaks!
          </p>

          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Choose your buddy
            </h3>
            <div className="flex flex-wrap gap-2">
              {BUDDY_ANIMALS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectAnimal(a.id)}
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 transition overflow-hidden ${
                    selectedAnimal === a.id
                      ? "border-prove-500 bg-prove-50 dark:border-prove-400 dark:bg-prove-950/50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                  }`}
                  title={a.name}
                >
                  <BuddyIllustration
                    animal={a.id}
                    stage="toddler"
                    size="small"
                    hatId={null}
                    accessoryId={null}
                  />
                </button>
              ))}
            </div>
          </div>

          {(["hat", "accessory"] as ItemSlot[]).map((slot) => (
            <div key={slot} className="mb-6">
              <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {SLOT_LABELS[slot]}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSetEquipped(slot, null)}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl transition ${
                    !equippedItems[slot]
                      ? "border-prove-500 bg-prove-50 dark:border-prove-400 dark:bg-prove-950/50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                  }`}
                  title="None"
                >
                  —
                </button>
                {BUDDY_ITEMS.filter((i) => i.slot === slot).map((item) => {
                  const owned = earnedSet.has(item.id);
                  const equipped = equippedItems[slot] === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => owned && onSetEquipped(slot, item.id)}
                      disabled={!owned}
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition overflow-hidden ${
                        equipped
                          ? "border-prove-500 bg-prove-50 dark:border-prove-400 dark:bg-prove-950/50"
                          : owned
                            ? "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                            : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-40 dark:border-slate-800 dark:bg-slate-900"
                      }`}
                      title={owned ? item.name : `Earn: ${getUnlockLabel(item)}`}
                    >
                      {slot === "hat" ? (
                        <svg viewBox="-16 -28 32 32" className="h-8 w-8">
                          <HatIllustration id={item.id as "cap" | "crown" | "grad" | "tophat" | "helmet"} size={28} />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-8 w-8">
                          <AccessoryIllustration id={item.id as "glasses" | "bow" | "star"} size={24} />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">How to earn</p>
            <ul className="mt-1 space-y-1 text-xs text-slate-500 dark:text-slate-500">
              <li>• First goal: Baseball cap</li>
              <li>• 7-day streak: Glasses</li>
              <li>• 14-day streak: Crown</li>
              <li>• 5 goals total: Bow</li>
              <li>• 30-day streak: Grad cap</li>
              <li>• 10 goals: Star badge</li>
              <li>• 20 goals: Helmet</li>
              <li>• 100-day streak: Top hat</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function getUnlockLabel(item: (typeof BUDDY_ITEMS)[0]): string {
  const { type, value } = item.unlock;
  if (type === "first_goal") return "Complete your first goal";
  if (type === "streak") return `${value}-day streak`;
  if (type === "total_goals") return `${value} goals completed`;
  return "";
}
