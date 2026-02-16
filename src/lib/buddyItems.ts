/**
 * Buddy customization items - earned by completing goals and streaks
 */

export type ItemSlot = "hat" | "accessory";

export interface BuddyItem {
  id: string;
  name: string;
  emoji: string;
  slot: ItemSlot;
  /** Unlock condition: { type, value } */
  unlock: { type: "first_goal" | "streak" | "total_goals"; value: number };
}

export const BUDDY_ITEMS: BuddyItem[] = [
  {
    id: "cap",
    name: "Baseball cap",
    emoji: "🧢",
    slot: "hat",
    unlock: { type: "first_goal", value: 1 },
  },
  {
    id: "glasses",
    name: "Glasses",
    emoji: "👓",
    slot: "accessory",
    unlock: { type: "streak", value: 3 },
  },
  {
    id: "crown",
    name: "Crown",
    emoji: "👑",
    slot: "hat",
    unlock: { type: "streak", value: 7 },
  },
  {
    id: "bow",
    name: "Bow",
    emoji: "🎀",
    slot: "accessory",
    unlock: { type: "total_goals", value: 5 },
  },
  {
    id: "grad",
    name: "Graduation cap",
    emoji: "🎓",
    slot: "hat",
    unlock: { type: "streak", value: 14 },
  },
  {
    id: "tophat",
    name: "Top hat",
    emoji: "🎩",
    slot: "hat",
    unlock: { type: "streak", value: 30 },
  },
  {
    id: "helmet",
    name: "Champion helmet",
    emoji: "🪖",
    slot: "hat",
    unlock: { type: "total_goals", value: 20 },
  },
  {
    id: "star",
    name: "Star badge",
    emoji: "⭐",
    slot: "accessory",
    unlock: { type: "total_goals", value: 10 },
  },
];

const STORAGE_EARNED = "proveit_buddy_earned";
const STORAGE_EQUIPPED = "proveit_buddy_equipped";

export type EquippedItems = Partial<Record<ItemSlot, string>>;

export function getStoredEarnedItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_EARNED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStoredEquippedItems(): EquippedItems {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_EQUIPPED);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEarnedItems(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_EARNED, JSON.stringify(ids));
}

export function saveEquippedItems(items: EquippedItems) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_EQUIPPED, JSON.stringify(items));
}

export function computeNewlyEarnedItems(
  currentEarned: string[],
  stats: {
    hasCompletedAnyGoal: boolean;
    maxStreak: number;
    totalGoalsCompleted: number;
  }
): string[] {
  const newlyEarned: string[] = [];
  for (const item of BUDDY_ITEMS) {
    if (currentEarned.includes(item.id)) continue;
    const { type, value } = item.unlock;
    let unlocked = false;
    if (type === "first_goal" && stats.hasCompletedAnyGoal && value <= 1) unlocked = true;
    if (type === "streak" && stats.maxStreak >= value) unlocked = true;
    if (type === "total_goals" && stats.totalGoalsCompleted >= value) unlocked = true;
    if (unlocked) newlyEarned.push(item.id);
  }
  return newlyEarned;
}

export function getItemById(id: string): BuddyItem | undefined {
  return BUDDY_ITEMS.find((i) => i.id === id);
}
