/**
 * Buddy animal types - user can choose their buddy's species
 */

export type BuddyAnimalId = "cat" | "dog" | "rabbit" | "fox";

export interface BuddyAnimal {
  id: BuddyAnimalId;
  name: string;
}

export const BUDDY_ANIMALS: BuddyAnimal[] = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "rabbit", name: "Rabbit" },
  { id: "fox", name: "Fox" },
];

const STORAGE_KEY = "proveit_buddy_animal";

export function getStoredBuddyAnimal(): BuddyAnimalId {
  if (typeof window === "undefined") return "cat";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && BUDDY_ANIMALS.some((a) => a.id === raw)) return raw as BuddyAnimalId;
  } catch {
    // ignore
  }
  return "cat";
}

export function saveBuddyAnimal(animalId: BuddyAnimalId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, animalId);
}
