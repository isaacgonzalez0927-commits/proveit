import { describe, expect, it } from "vitest";
import {
  mergeServerGoalsWithSessionSnapshot,
  mergeServerSubmissionsWithSessionSnapshot,
  type SbSessionSnapshotV1,
} from "@/lib/store";
import type { Goal, ProofSubmission } from "@/types";

const uid = "user-1";

function snap(goals: Goal[], submissions: ProofSubmission[] = []): SbSessionSnapshotV1 {
  return { v: 1, userId: uid, goals, submissions };
}

describe("mergeServerGoalsWithSessionSnapshot", () => {
  it("returns server list when snapshot user mismatches", () => {
    const server = [{ id: "a" } as Goal];
    const s = snap([{ id: "b" } as Goal]);
    expect(mergeServerGoalsWithSessionSnapshot(server, s, "other")).toEqual(server);
  });

  it("appends snapshot-only goals when server returns empty", () => {
    const localGoal = { id: "local-1" } as Goal;
    const merged = mergeServerGoalsWithSessionSnapshot([], snap([localGoal]), uid);
    expect(merged).toEqual([localGoal]);
  });

  it("merges unique ids when server returns a subset", () => {
    const g1 = { id: "1" } as Goal;
    const g2 = { id: "2" } as Goal;
    const merged = mergeServerGoalsWithSessionSnapshot([g1], snap([g1, g2]), uid);
    expect(merged.map((g) => g.id).sort()).toEqual(["1", "2"]);
  });
});

describe("mergeServerSubmissionsWithSessionSnapshot", () => {
  it("appends snapshot-only submissions when server list is empty", () => {
    const sub = { id: "s1" } as ProofSubmission;
    const merged = mergeServerSubmissionsWithSessionSnapshot([], snap([], [sub]), uid);
    expect(merged).toEqual([sub]);
  });
});
