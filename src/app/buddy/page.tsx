"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Pencil, Save, Trash2, X, Pause, Play, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BuddySkeleton } from "@/components/BuddySkeleton";
import {
  getDueDayName,
  getSubmissionWindowMessage,
  isGoalDue,
  isWithinSubmissionWindow,
  normalizeReminderTimeInput,
} from "@/lib/goalDue";
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  applyGoalStreakOverride,
  DEFAULT_DEVELOPER_MODE_SETTINGS,
  getStoredDeveloperModeSettings,
  saveDeveloperModeSettings,
  type DeveloperModeSettings,
} from "@/lib/developerMode";
import {
  getMaxPlantVariantForPlan,
  getPlantVariantsForPlan,
  isFinalStage,
  type GoalPlantVariant,
} from "@/lib/goalPlants";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "@/lib/goalProgress";
import { getBreakDurationDays, isProBreakExpired, PRO_GOAL_BREAK_MAX_DAYS } from "@/lib/goalBreak";
import { GardenSnapshot } from "@/components/GardenSnapshot";
import { PlantIllustration } from "@/components/PlantIllustration";
import { PLANT_GROWTH_STAGES, getPlantStageForStreak } from "@/lib/plantGrowth";
import { getPlan } from "@/lib/store";
import { getStoredAppSettings } from "@/lib/appSettings";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { CongratulationsModal } from "@/components/CongratulationsModal";
import { TimesPerWeekControl } from "@/components/TimesPerWeekControl";
import { messageFromApiPayload } from "@/lib/apiErrors";
import {
  isProofRequirementAllowed,
  PROOF_SUGGESTIONS_MAX,
  PROOF_SUGGESTIONS_MIN,
} from "@/lib/proofSuggestions";
import type { Goal, TimesPerWeek } from "@/types";
import { effectiveTimesPerWeek, spreadReminderDaysForTimesPerWeek } from "@/lib/goalSchedule";
import {
  TOUR_CHANGED_EVENT,
  TOUR_GARDEN_HINT_KEY,
  TOUR_RESUME_KEY,
  TOUR_SPOTLIGHT_KEY,
  TOUR_START_KEY,
  dispatchTourChanged,
  isGoalFormTourPhase,
} from "@/lib/tourStorage";

const FIRST_FULL_GROWN_STORAGE_KEY = "proveit_first_full_grown_congrats_shown";

export default function BuddyPage() {
  const {
    user,
    goals,
    addGoal,
    updateGoal,
    removeGoal,
    canAddGoal,
    getSubmissionsForGoal,
    getGoalPlantVariant,
    setGoalPlantVariant,
    clearPlanSelectionForNewUser,
    restoreActualAccount,
  } = useApp();
  const [developerSettings, setDeveloperSettings] = useState<DeveloperModeSettings>(
    DEFAULT_DEVELOPER_MODE_SETTINGS
  );
  const [goalStreakDrafts, setGoalStreakDrafts] = useState<Record<string, string>>({});
  const [developerMessage, setDeveloperMessage] = useState<string | null>(null);
  const [goalManagerMessage, setGoalManagerMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("09:00");
  const [newTimesPerWeek, setNewTimesPerWeek] = useState<TimesPerWeek>(3);
  const [scheduleTourAck, setScheduleTourAck] = useState(false);
  const [newPlantVariant, setNewPlantVariant] = useState<GoalPlantVariant>(
    () => getStoredAppSettings().defaultGoalPlantVariant
  );
  const [newProofSuggestions, setNewProofSuggestions] = useState<string[]>([]);
  const [selectedProofRequirement, setSelectedProofRequirement] = useState<string | null>(null);
  const [suggestionsTitleKey, setSuggestionsTitleKey] = useState<string | null>(null);
  const [proofSuggestionsLoading, setProofSuggestionsLoading] = useState(false);
  const [proofSuggestionsError, setProofSuggestionsError] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [proofIdeasEditLoading, setProofIdeasEditLoading] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    reminderTime: string;
    timesPerWeek: TimesPerWeek;
    proofSuggestions: string[];
    proofRequirement: string;
  }>({
    reminderTime: "09:00",
    timesPerWeek: 3,
    proofSuggestions: [],
    proofRequirement: "",
  });
  const router = useRouter();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const hasPlayedFinalAnimationForGoal = useRef<Set<string>>(new Set());
  const [, setFinalAnimationTick] = useState(0);
  const [showGardenTourHint, setShowGardenTourHint] = useState(false);
  const [gardenTourHintStep, setGardenTourHintStep] = useState<"manage" | "create">("manage");
  const [tourSpotlight, setTourSpotlight] = useState<string | null>(null);
  const proofFetchGen = useRef(0);
  const proofEditFetchGen = useRef(0);
  const newTitleRef = useRef(newTitle);
  newTitleRef.current = newTitle;

  useEffect(() => {
    setDeveloperSettings(getStoredDeveloperModeSettings());
  }, []);

  useEffect(() => {
    const sync = () => setTourSpotlight(window.localStorage.getItem(TOUR_SPOTLIGHT_KEY));
    sync();
    window.addEventListener(TOUR_CHANGED_EVENT, sync);
    return () => window.removeEventListener(TOUR_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!showCreateForm || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(TOUR_SPOTLIGHT_KEY);
    if (!raw || !isGoalFormTourPhase(raw)) return;

    if (raw === "goal-title" && newTitle.trim().length >= 2) {
      window.localStorage.setItem(TOUR_SPOTLIGHT_KEY, "goal-proof-fetch");
      dispatchTourChanged();
      return;
    }
    if (raw === "goal-proof-fetch" && newProofSuggestions.length >= PROOF_SUGGESTIONS_MIN) {
      const picked =
        selectedProofRequirement !== null &&
        isProofRequirementAllowed(selectedProofRequirement, newProofSuggestions);
      window.localStorage.setItem(TOUR_SPOTLIGHT_KEY, picked ? "goal-schedule" : "goal-proof-pick");
      dispatchTourChanged();
      return;
    }
    if (
      raw === "goal-proof-pick" &&
      selectedProofRequirement !== null &&
      isProofRequirementAllowed(selectedProofRequirement, newProofSuggestions)
    ) {
      window.localStorage.setItem(TOUR_SPOTLIGHT_KEY, "goal-schedule");
      dispatchTourChanged();
      return;
    }
    if (raw === "goal-schedule" && scheduleTourAck) {
      window.localStorage.setItem(TOUR_SPOTLIGHT_KEY, "goal-submit");
      dispatchTourChanged();
    }
  }, [
    showCreateForm,
    newTitle,
    newProofSuggestions,
    selectedProofRequirement,
    scheduleTourAck,
  ]);

  useEffect(() => {
    if (showCreateForm || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(TOUR_SPOTLIGHT_KEY);
    if (raw && isGoalFormTourPhase(raw)) {
      window.localStorage.removeItem(TOUR_SPOTLIGHT_KEY);
      dispatchTourChanged();
    }
  }, [showCreateForm]);

  // When the dashboard tour sends the user to the Garden, show a guided hint in-place.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    if (goals.length > 0) {
      window.localStorage.removeItem(TOUR_GARDEN_HINT_KEY);
      setShowGardenTourHint(false);
      setGardenTourHintStep("manage");
      return;
    }
    const hint = window.localStorage.getItem(TOUR_GARDEN_HINT_KEY);
    if (hint) {
      setShowGardenTourHint(true);
      setGardenTourHintStep("manage");
      // Do not close the add-goal form here — it fought users who opened "Add goal" while the tour hint was active.
    }
  }, [user, goals.length]);

  // Mark goals at final stage so we only play the full-grown animation once (use goals + streak/variant, no garden ref)
  const finalStageDeps = goals.map((g) => `${g.id}:${getGoalStreak(g, getSubmissionsForGoal)}:${getGoalPlantVariant(g.id)}`).join("|");
  useEffect(() => {
    let added = false;
    for (const goal of goals) {
      const streak = getGoalStreak(goal, getSubmissionsForGoal);
      const stage = getPlantStageForStreak(streak).stage;
      const variant = getGoalPlantVariant(goal.id);
      if (isFinalStage(stage, variant) && !hasPlayedFinalAnimationForGoal.current.has(goal.id)) {
        hasPlayedFinalAnimationForGoal.current.add(goal.id);
        added = true;
      }
    }
    if (added) setFinalAnimationTick((t) => t + 1);
  }, [finalStageDeps, goals]);

  const isCreatorAccount = hasCreatorAccess(user?.email, user?.contactEmail);
  const effectiveDeveloperSettings = isCreatorAccount
    ? developerSettings
    : DEFAULT_DEVELOPER_MODE_SETTINGS;
  const canEditExistingGoalStyle = user?.plan === "pro" || user?.plan === "premium";
  const plantVariantsForPlan = getPlantVariantsForPlan(user?.plan ?? "free");
  const canUseGoalBreak = user?.plan === "pro" || user?.plan === "premium";
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showFirstGoalCongrats, setShowFirstGoalCongrats] = useState(false);
  const [showFirstFullGrownCongrats, setShowFirstFullGrownCongrats] = useState(false);

  useEffect(() => {
    if (!isCreatorAccount) return;
    const nextDrafts: Record<string, string> = {};
    for (const goal of goals) {
      const override = developerSettings.goalStreakOverrides[goal.id];
      nextDrafts[goal.id] = override == null ? "" : String(override);
    }
    setGoalStreakDrafts(nextDrafts);
  }, [goals, developerSettings.goalStreakOverrides, isCreatorAccount]);

  // Pro: auto-resume goals that have been on break for 3+ days
  useEffect(() => {
    if (user?.plan !== "pro" || !goals.length) return;
    for (const goal of goals) {
      if (isProBreakExpired(goal, user.plan)) {
        const snapshot = goal.breakStreakSnapshot ?? 0;
        updateGoal(goal.id, { isOnBreak: false, streakCarryover: snapshot });
      }
    }
  }, [goals, user?.plan]);

  if (!user) {
    return <BuddySkeleton />;
  }

  const parseNonNegativeInt = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  };

  const persistDeveloperSettings = (next: DeveloperModeSettings) => {
    setDeveloperSettings(next);
    saveDeveloperModeSettings(next);
  };

  const handleGoalStreakDraftChange = (goalId: string, value: string) => {
    const cleaned = value.replace(/[^\d]/g, "");
    setGoalStreakDrafts((prev) => ({ ...prev, [goalId]: cleaned }));
  };

  const applyGoalStreakDraft = (goalId: string) => {
    const parsed = parseNonNegativeInt(goalStreakDrafts[goalId] ?? "");
    const nextOverrides = { ...developerSettings.goalStreakOverrides };
    if (parsed == null) {
      delete nextOverrides[goalId];
      setDeveloperMessage("Removed streak override for this goal.");
    } else {
      nextOverrides[goalId] = parsed;
      setDeveloperMessage(`Set this goal's streak override to ${parsed}.`);
    }
    const next: DeveloperModeSettings = {
      ...developerSettings,
      enabled: true,
      goalStreakOverrides: nextOverrides,
    };
    persistDeveloperSettings(next);
  };

  const clearGoalStreakDraft = (goalId: string) => {
    const nextOverrides = { ...developerSettings.goalStreakOverrides };
    delete nextOverrides[goalId];
    setGoalStreakDrafts((prev) => ({ ...prev, [goalId]: "" }));
    const next: DeveloperModeSettings = {
      ...developerSettings,
      goalStreakOverrides: nextOverrides,
    };
    persistDeveloperSettings(next);
    setDeveloperMessage("Cleared streak override for this goal.");
  };

  const clearAllGoalStreakOverrides = () => {
    const next: DeveloperModeSettings = {
      ...developerSettings,
      goalStreakOverrides: {},
    };
    persistDeveloperSettings(next);
    setDeveloperMessage("Cleared all goal streak overrides.");
  };

  const plan = getPlan(user.plan);
  const canAddMoreGoals = canAddGoal();
  const proofIdeasReadyForCreate =
    suggestionsTitleKey === newTitle.trim() &&
    newTitle.trim().length >= 2 &&
    newProofSuggestions.length >= PROOF_SUGGESTIONS_MIN &&
    selectedProofRequirement !== null &&
    isProofRequirementAllowed(selectedProofRequirement, newProofSuggestions);
  const canSubmitCreateGoalForm = canAddMoreGoals && proofIdeasReadyForCreate;

  const resetCreateGoalForm = () => {
    if (typeof window !== "undefined") {
      const p = window.localStorage.getItem(TOUR_SPOTLIGHT_KEY);
      if (p && isGoalFormTourPhase(p)) {
        window.localStorage.removeItem(TOUR_SPOTLIGHT_KEY);
        dispatchTourChanged();
      }
    }
    const appSettings = getStoredAppSettings();
    setNewTitle("");
    setNewDescription("");
    setNewReminderTime("09:00");
    setNewTimesPerWeek(3);
    setScheduleTourAck(false);
    setNewPlantVariant(appSettings.defaultGoalPlantVariant);
    setNewProofSuggestions([]);
    setSelectedProofRequirement(null);
    setSuggestionsTitleKey(null);
    setProofSuggestionsError(null);
    setProofSuggestionsLoading(false);
  };

  const fetchProofIdeasForCreate = async () => {
    setProofSuggestionsError(null);
    const trimmed = newTitle.trim();
    if (trimmed.length < 2) {
      setProofSuggestionsError("Enter a goal title first (at least 2 characters).");
      return;
    }
    const gen = ++proofFetchGen.current;
    setProofSuggestionsLoading(true);
    try {
      const res = await fetch("/api/goals/proof-suggestions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      let data: { suggestions?: unknown; error?: string };
      try {
        data = (await res.json()) as { suggestions?: unknown; error?: string };
      } catch {
        if (gen !== proofFetchGen.current) return;
        setProofSuggestionsError("Bad response from server. Try again.");
        setNewProofSuggestions([]);
        setSelectedProofRequirement(null);
        setSuggestionsTitleKey(null);
        return;
      }
      if (gen !== proofFetchGen.current) return;
      if (newTitleRef.current.trim() !== trimmed) {
        setProofSuggestionsError("Title changed while loading — tap Get AI photo ideas again.");
        setNewProofSuggestions([]);
        setSelectedProofRequirement(null);
        setSuggestionsTitleKey(null);
        return;
      }
      if (!res.ok) {
        setProofSuggestionsError(messageFromApiPayload(data, "Could not load AI photo ideas."));
        setNewProofSuggestions([]);
        setSelectedProofRequirement(null);
        setSuggestionsTitleKey(null);
        return;
      }
      const list = Array.isArray(data.suggestions)
        ? data.suggestions.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
        : [];
      if (list.length < PROOF_SUGGESTIONS_MIN) {
        setProofSuggestionsError("AI didn’t return enough prompts. Try again.");
        setNewProofSuggestions([]);
        setSelectedProofRequirement(null);
        setSuggestionsTitleKey(null);
        return;
      }
      const slice = list.slice(0, PROOF_SUGGESTIONS_MAX);
      setProofSuggestionsError(null);
      setNewProofSuggestions(slice);
      setSelectedProofRequirement(slice[0] ?? null);
      setSuggestionsTitleKey(trimmed);
    } catch {
      if (gen !== proofFetchGen.current) return;
      setProofSuggestionsError("Network error loading AI photo ideas.");
      setNewProofSuggestions([]);
      setSelectedProofRequirement(null);
      setSuggestionsTitleKey(null);
    } finally {
      if (gen === proofFetchGen.current) {
        setProofSuggestionsLoading(false);
      }
    }
  };

  const fetchProofIdeasForEdit = async (title: string) => {
    const trimmed = title.trim();
    if (trimmed.length < 2) return;
    const gen = ++proofEditFetchGen.current;
    setProofIdeasEditLoading(true);
    setGoalManagerMessage(null);
    try {
      const res = await fetch("/api/goals/proof-suggestions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      let data: { suggestions?: unknown; error?: string };
      try {
        data = (await res.json()) as { suggestions?: unknown; error?: string };
      } catch {
        if (gen !== proofEditFetchGen.current) return;
        setGoalManagerMessage("Bad response from server. Try again.");
        return;
      }
      if (gen !== proofEditFetchGen.current) return;
      if (!res.ok) {
        setGoalManagerMessage(messageFromApiPayload(data, "Could not refresh AI photo ideas."));
        return;
      }
      const list = Array.isArray(data.suggestions)
        ? data.suggestions.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
        : [];
      if (list.length < 2) {
        setGoalManagerMessage("Not enough new suggestions. Try again.");
        return;
      }
      const next = list.slice(0, 3);
      setEditDraft((prev) => ({
        ...prev,
        proofSuggestions: next,
        proofRequirement: next[0] ?? "",
      }));
      setGoalManagerMessage("AI prompts updated — pick the one you want to use.");
    } catch {
      if (gen !== proofEditFetchGen.current) return;
      setGoalManagerMessage("Could not refresh AI photo ideas.");
    } finally {
      if (gen === proofEditFetchGen.current) {
        setProofIdeasEditLoading(false);
      }
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingGoal) return;
    setGoalManagerMessage(null);
    if (!canSubmitCreateGoalForm) {
      if (!proofIdeasReadyForCreate) {
        setGoalManagerMessage("Tap Get AI photo ideas, then pick how you’ll prove this goal (or fix the title if it changed).");
      } else if (!canAddMoreGoals) {
        setGoalManagerMessage("Goal limit reached for your current plan. Upgrade to add more.");
      }
      return;
    }
    if (!newTitle.trim()) {
      setGoalManagerMessage("Goal title is required.");
      return;
    }
    if (!canAddMoreGoals) {
      setGoalManagerMessage("Goal limit reached for your current plan. Upgrade to add more.");
      return;
    }
    const tw = newTimesPerWeek;
    const isDaily = tw >= 7;
    const reminderDays = isDaily ? undefined : spreadReminderDaysForTimesPerWeek(tw);
    const reminderDayFirst = isDaily ? 0 : (reminderDays?.[0] ?? 0);

    if (
      !selectedProofRequirement ||
      !isProofRequirementAllowed(selectedProofRequirement, newProofSuggestions)
    ) {
      setGoalManagerMessage("Tap Get AI photo ideas, then choose how you’ll prove this goal.");
      return;
    }
    if (suggestionsTitleKey !== newTitle.trim()) {
      setGoalManagerMessage("Your title changed after loading AI prompts. Tap Get AI photo ideas again.");
      return;
    }

    const hadNoGoals = goals.length === 0;
    setIsAddingGoal(true);
    try {
      const result = await addGoal({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        frequency: isDaily ? "daily" : "weekly",
        timesPerWeek: isDaily ? 7 : tw,
        reminderTime: newReminderTime,
        reminderDay: reminderDayFirst,
        reminderDays,
        proofSuggestions: newProofSuggestions,
        proofRequirement: selectedProofRequirement,
      });
      if (!result.created) {
        const err = result.error?.trim() || "Something went wrong. Please try again.";
        setGoalManagerMessage(err.startsWith("Could not") ? err : `Could not create goal: ${err}`);
        if (err && /limit|upgrade|pro|premium/i.test(err)) setShowUpgradePrompt(true);
        return;
      }
      const maxVariant = getMaxPlantVariantForPlan(user?.plan ?? "free");
      setGoalPlantVariant(result.created.id, Math.min(newPlantVariant, maxVariant) as GoalPlantVariant);
      setShowCreateForm(false);
      resetCreateGoalForm();
      setGoalManagerMessage("Goal added to your garden.");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TOUR_GARDEN_HINT_KEY);
        window.localStorage.setItem(TOUR_START_KEY, "1");
        window.localStorage.setItem(TOUR_RESUME_KEY, "3");
      }
      setShowGardenTourHint(false);
      setGardenTourHintStep("manage");
      if (hadNoGoals) setShowFirstGoalCongrats(true);
    } finally {
      setIsAddingGoal(false);
    }
  };

  const startEditingGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    const timeNorm = normalizeReminderTimeInput(goal.reminderTime);
    const sugg = goal.proofSuggestions?.length ? [...goal.proofSuggestions] : [];
    const req =
      goal.proofRequirement && sugg.includes(goal.proofRequirement)
        ? goal.proofRequirement
        : (sugg[0] ?? "");
    setEditDraft({
      reminderTime: timeNorm || "09:00",
      timesPerWeek: effectiveTimesPerWeek(goal),
      proofSuggestions: sugg,
      proofRequirement: req,
    });
    setGoalManagerMessage(null);
  };

  const cancelEditingGoal = () => {
    setEditingGoalId(null);
    setIsSavingEdit(false);
  };

  const saveEditingGoal = async (goal: Goal) => {
    setGoalManagerMessage(null);
    if (editDraft.proofSuggestions.length >= 2) {
      if (!isProofRequirementAllowed(editDraft.proofRequirement, editDraft.proofSuggestions)) {
        setGoalManagerMessage("Choose one of the suggested photo prompts.");
        return;
      }
    }

    const tw = editDraft.timesPerWeek;
    const isDaily = tw >= 7;
    const reminderDays = isDaily ? ([] as number[]) : spreadReminderDaysForTimesPerWeek(tw);

    setIsSavingEdit(true);
    try {
      const schedulePayload = {
        frequency: isDaily ? ("daily" as const) : ("weekly" as const),
        timesPerWeek: isDaily ? 7 : tw,
        reminderTime: editDraft.reminderTime,
        reminderDay: isDaily ? 0 : reminderDays[0]!,
        reminderDays: isDaily ? ([] as number[]) : reminderDays,
      };
      if (editDraft.proofSuggestions.length >= 2) {
        await updateGoal(goal.id, {
          ...schedulePayload,
          proofSuggestions: editDraft.proofSuggestions,
          proofRequirement: editDraft.proofRequirement.trim(),
        });
      } else {
        await updateGoal(goal.id, schedulePayload);
      }
      setEditingGoalId(null);
      setGoalManagerMessage("Goal updated.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteGoalFromGarden = async (goal: Goal) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete "${goal.title}" and all of its proof history? This can't be undone.`
      );
      if (!confirmed) return;
    }
    await removeGoal(goal.id);
    if (editingGoalId === goal.id) {
      cancelEditingGoal();
    }
    setGoalManagerMessage("Goal deleted.");
  };

  const toggleGoalBreak = async (goal: Goal, displayedStreak: number) => {
    if (!canUseGoalBreak) {
      setGoalManagerMessage("Upgrade to Pro or Premium to use goal breaks.");
      return;
    }

    if (goal.isOnBreak) {
      await updateGoal(goal.id, {
        isOnBreak: false,
        streakCarryover: displayedStreak,
      });
      setGoalManagerMessage(`"${goal.title}" is active again. Streak continuity is preserved.`);
      return;
    }

    await updateGoal(goal.id, {
      isOnBreak: true,
      breakStartedAt: new Date().toISOString(),
      breakStreakSnapshot: displayedStreak,
      streakCarryover: displayedStreak,
    });
    const breakLimitMsg = user?.plan === "pro" ? " (up to 3 days)" : "";
    setGoalManagerMessage(`"${goal.title}" is now on break${breakLimitMsg}. Streak and growth are frozen.`);
  };

  const garden = goals.map((goal) => {
    const actualStreak = getGoalStreak(goal, getSubmissionsForGoal);
    const streak = applyGoalStreakOverride(goal.id, actualStreak, effectiveDeveloperSettings);
    // Stage is derived from streak only. Changing plant style (variant) must not affect stage.
    const stage = getPlantStageForStreak(streak);
    const isOnBreak = goal.isOnBreak === true;
    const due = isGoalDue(goal);
    const doneInCurrentWindow = isOnBreak
      ? false
      : isGoalDoneInCurrentWindow(goal, getSubmissionsForGoal, todayStr);
    const canSubmitNow = isWithinSubmissionWindow(goal);
    const submissionWindowMessage =
      !doneInCurrentWindow && !canSubmitNow
        ? (getSubmissionWindowMessage(goal) ?? "Submission window closed")
        : null;
    const wateringLevel = isOnBreak ? 0.62 : doneInCurrentWindow ? 1 : due ? 0.18 : 0.62;
    const breakDays = getBreakDurationDays(goal);
    const isProPlan = user?.plan === "pro";
    return {
      goal,
      isOnBreak,
      breakDays,
      isProPlan,
      actualStreak,
      streak,
      stage,
      due,
      canSubmitNow,
      doneInCurrentWindow,
      submissionWindowMessage,
      wateringLevel,
      plantVariant: getGoalPlantVariant(goal.id),
      hasStreakOverride:
        effectiveDeveloperSettings.enabled &&
        typeof effectiveDeveloperSettings.goalStreakOverrides[goal.id] === "number",
    };
  });

  const hydratedNow = garden.filter((g) => g.doneInCurrentWindow).length;
  const goalsDueNow = garden.filter((g) => g.due).length;
  const fullyGrownCount = garden.filter((g) =>
    isFinalStage(g.stage.stage, g.plantVariant)
  ).length;
  const snapshotPlants = [...garden]
    .sort((a, b) => b.streak - a.streak)
    .map((entry) => ({
      id: entry.goal.id,
      stage: entry.stage.stage,
      wateringLevel: entry.wateringLevel,
      variant: entry.plantVariant,
    }));

  useEffect(() => {
    if (fullyGrownCount < 1) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(FIRST_FULL_GROWN_STORAGE_KEY)) return;
    setShowFirstFullGrownCongrats(true);
  }, [fullyGrownCount]);

  return (
    <>
      {showFirstGoalCongrats && (
        <CongratulationsModal
          variant="first_goal"
          onClose={() => setShowFirstGoalCongrats(false)}
        />
      )}
      {showFirstFullGrownCongrats && (
        <CongratulationsModal
          variant="first_full_grown"
          onClose={() => {
            if (typeof window !== "undefined") {
              localStorage.setItem(FIRST_FULL_GROWN_STORAGE_KEY, "1");
            }
            setShowFirstFullGrownCongrats(false);
          }}
        />
      )}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Goal Garden
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Each goal is a plant. Stay on rhythm, submit proof when it&apos;s due, and watch it grow to the final stage.
          </p>
          <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-500">
            {goals.length} active · {plan.name} ({plan.maxGoals === -1 ? "unlimited" : plan.maxGoals} goal
            {plan.maxGoals === 1 ? "" : "s"})
          </p>
          {showGardenTourHint && !tourSpotlight && (
            <div className="mt-3 rounded-2xl border border-prove-200 bg-prove-50 px-3 py-3 text-xs text-slate-700 dark:border-prove-800 dark:bg-prove-950/40 dark:text-slate-200">
              {gardenTourHintStep === "manage" ? (
                <>
                  <p className="font-semibold text-prove-700 dark:text-prove-300">
                    Step 2: Goal Garden
                  </p>
                  <p className="mt-1">
                    This is where you can manage your goals, schedules, and plant styles.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setGardenTourHintStep("create");
                      setShowCreateForm(true);
                    }}
                    className="mt-2 inline-flex items-center rounded-lg border border-prove-300 px-2.5 py-1 text-[11px] font-semibold text-prove-700 hover:bg-prove-100 dark:border-prove-700 dark:text-prove-300 dark:hover:bg-prove-900/40"
                  >
                    Show me how to create one
                  </button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-prove-700 dark:text-prove-300">
                    Step 3: Create your first goal
                  </p>
                  <p className="mt-1">
                    Name the goal, pick an AI photo prompt, set how many times per week and your reminder time, then tap{" "}
                    <span className="font-semibold">Add goal</span>.
                  </p>
                </>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-tour="add-goal-button"
              onClick={() => {
                setGoalManagerMessage(null);
                if (!canAddMoreGoals) {
                  setShowUpgradePrompt(true);
                  return;
                }
                if (typeof window !== "undefined" && window.localStorage.getItem(TOUR_SPOTLIGHT_KEY) === "add-goal-button") {
                  window.localStorage.removeItem(TOUR_SPOTLIGHT_KEY);
                  window.localStorage.removeItem(TOUR_GARDEN_HINT_KEY);
                  window.localStorage.setItem(TOUR_RESUME_KEY, "3");
                  dispatchTourChanged();
                }
                setShowCreateForm((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1 rounded-lg bg-prove-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-prove-700 btn-glass-primary ${
                tourSpotlight === "add-goal-button" ? "relative z-[100]" : ""
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              {showCreateForm ? "Close" : "New goal"}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 text-center dark:border-slate-700/90 dark:bg-slate-900/40">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{goals.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 text-center dark:border-slate-700/90 dark:bg-slate-900/40">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Watered today</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{hydratedNow}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-500">
              {goalsDueNow > 0 ? `${goalsDueNow} due` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 text-center dark:border-slate-700/90 dark:bg-slate-900/40">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Fully grown</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{fullyGrownCount}</p>
          </div>
        </div>

        {goalManagerMessage && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {goalManagerMessage}
          </p>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateGoal}
            className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700/90 dark:bg-slate-900/70"
          >
            <div className="border-b border-slate-200/80 pb-4 dark:border-slate-700/80">
              <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                New goal
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Proof, weekly target, daily reminder — then add to your garden.
              </p>
            </div>
            {!canAddMoreGoals && (
              <p className="mt-4 text-sm text-amber-800 dark:text-amber-200">
                Goal limit reached.{" "}
                <Link href="/pricing" className="font-medium underline underline-offset-2">
                  View plans
                </Link>
              </p>
            )}

            <div className="mt-5 space-y-2" data-tour="goal-title">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Something you can prove with a photo"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-prove-500 focus:outline-none focus:ring-1 focus:ring-prove-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                required
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional note (only you see this)"
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-prove-500 focus:outline-none focus:ring-1 focus:ring-prove-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div
              className="mt-6 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-600/80 dark:bg-slate-950/40"
              data-tour="goal-proof-fetch"
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Photo proof</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                AI suggests short prompts from your title. Pick one; you can refresh or change it later in edit.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchProofIdeasForCreate()}
                  disabled={proofSuggestionsLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-prove-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-prove-700 disabled:opacity-60"
                >
                  {proofSuggestionsLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Asking AI…
                    </>
                  ) : (
                    "Get AI photo ideas"
                  )}
                </button>
                {newProofSuggestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void fetchProofIdeasForCreate()}
                    disabled={proofSuggestionsLoading}
                    className="text-xs font-medium text-prove-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-prove-300"
                  >
                    Refresh AI ideas
                  </button>
                )}
              </div>
              {proofSuggestionsError && (
                <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">{proofSuggestionsError}</p>
              )}
              {newProofSuggestions.length > 0 && (
                <ul className="mt-3 space-y-2" data-tour="goal-proof-pick">
                  {newProofSuggestions.map((s, idx) => (
                    <li key={`proof-opt-${idx}`}>
                      <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                        <input
                          type="radio"
                          name="proof-requirement-new"
                          checked={selectedProofRequirement === s}
                          onChange={() => setSelectedProofRequirement(s)}
                          className="mt-1"
                        />
                        <span>{s}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 space-y-4" data-tour="goal-schedule">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Times per week</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Use the slider or + / −. We space proof due days for you; you still get a daily reminder at the time below.
                </p>
                <div className="mt-3">
                  <TimesPerWeekControl
                    value={newTimesPerWeek}
                    onChange={(n) => {
                      setNewTimesPerWeek(n);
                      setScheduleTourAck(true);
                    }}
                  />
                </div>
              </div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Daily reminder time
                <input
                  type="time"
                  value={newReminderTime}
                  onChange={(e) => {
                    setNewReminderTime(e.target.value);
                    setScheduleTourAck(true);
                  }}
                  className="mt-1.5 w-full max-w-[11rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-prove-500 focus:outline-none focus:ring-1 focus:ring-prove-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  required
                />
              </label>
            </div>

            <div className="mt-6" data-tour="goal-submit">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Plant</p>
              {goals.length === 0 && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Final look only — growth stages stay the same until the plant is fully grown.
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {plantVariantsForPlan.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setNewPlantVariant(variant)}
                    className={`rounded-lg border p-1.5 transition ${
                      (Math.min(newPlantVariant, getMaxPlantVariantForPlan(user?.plan ?? "free")) as GoalPlantVariant) === variant
                        ? "border-prove-500 bg-prove-50 ring-1 ring-prove-500/30 dark:border-prove-400 dark:bg-prove-950/50"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900"
                    }`}
                    aria-label={`Plant style ${variant}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-slate-50 dark:bg-slate-950">
                      <PlantIllustration
                        stage="flowering"
                        wateringLevel={1}
                        wateredGoals={1}
                        size="small"
                        variant={variant}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200/80 pt-5 dark:border-slate-700/80">
              <button
                type="submit"
                disabled={isAddingGoal || !canSubmitCreateGoalForm}
                title={!proofIdeasReadyForCreate ? "Get AI photo ideas and choose one prompt first" : undefined}
                className="rounded-lg bg-prove-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-prove-700 disabled:opacity-60"
              >
                {isAddingGoal ? "Adding…" : "Add goal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateGoalForm();
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overview
          </h2>
          <GardenSnapshot plants={snapshotPlants} className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/30 p-2 dark:border-slate-700/80 dark:bg-slate-900/30" />
        </section>

        {isCreatorAccount && developerSettings.enabled && (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/60 dark:bg-amber-950/25">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Developer mode (garden controls)
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  Turn on/off from Settings only. Per-goal controls appear below when enabled.
                </p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center rounded-md border border-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Open Settings
              </Link>
            </div>
            <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
              Current status: ON.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearAllGoalStreakOverrides}
                className="rounded-md border border-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Clear all goal streak overrides
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPlanSelectionForNewUser();
                  router.push("/");
                }}
                className="rounded-md border border-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Treat as new user
              </button>
              <button
                type="button"
                onClick={restoreActualAccount}
                className="rounded-md border border-emerald-500 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-600 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                Go back to my actual account
              </button>
            </div>
            {developerMessage && (
              <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">{developerMessage}</p>
            )}
          </section>
        )}

        {goals.length === 0 ? (
          <div className="rounded-2xl p-6 text-center glass-card">
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              No plants yet
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Create your first goal and pick a plant style to start your garden.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!canAddMoreGoals) {
                  setShowUpgradePrompt(true);
                } else {
                  if (typeof window !== "undefined" && window.localStorage.getItem(TOUR_SPOTLIGHT_KEY) === "add-goal-button") {
                    window.localStorage.removeItem(TOUR_SPOTLIGHT_KEY);
                    window.localStorage.removeItem(TOUR_GARDEN_HINT_KEY);
                    window.localStorage.setItem(TOUR_RESUME_KEY, "3");
                    dispatchTourChanged();
                  }
                  setShowCreateForm(true);
                }
              }}
              className={`mt-5 inline-flex rounded-xl bg-prove-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-prove-700 ${
                tourSpotlight === "add-goal-button" ? "relative z-[100]" : ""
              }`}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add your first goal
            </button>
          </div>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {garden.map((entry) => (
              <article
                key={entry.goal.id}
                className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700/90 dark:bg-slate-900/50"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{entry.goal.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {getDueDayName(entry.goal)}
                    </p>
                    {entry.goal.proofRequirement ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Prove: </span>
                        {entry.goal.proofRequirement}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-amber-700/90 dark:text-amber-300/90">
                        No photo prompt saved — edit this goal and load AI photo ideas.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {entry.isOnBreak && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                        {entry.isProPlan ? `Break (${Math.min(entry.breakDays, PRO_GOAL_BREAK_MAX_DAYS)}/${PRO_GOAL_BREAK_MAX_DAYS} days)` : "On break"}
                      </span>
                    )}
                    <span className="rounded-full border border-emerald-200 bg-white/80 px-2 py-1 text-[11px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {entry.stage.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (canUseGoalBreak) {
                          toggleGoalBreak(entry.goal, entry.streak);
                        } else {
                          setShowUpgradePrompt(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white/80 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-900/60 dark:text-amber-300 dark:hover:bg-amber-900/30"
                      aria-label={entry.isOnBreak ? "Resume goal from break" : "Put goal on break"}
                    >
                      {entry.isOnBreak ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      {entry.isOnBreak ? "Resume" : "Break"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editingGoalId === entry.goal.id
                          ? cancelEditingGoal()
                          : startEditingGoal(entry.goal)
                      }
                      className="rounded-md border border-slate-300 bg-white/80 p-1 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      aria-label={editingGoalId === entry.goal.id ? "Close edit" : "Edit goal"}
                    >
                      {editingGoalId === entry.goal.id ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGoalFromGarden(entry.goal)}
                      className="rounded-md border border-red-300 bg-white/80 p-1 text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-slate-900/60 dark:text-red-300 dark:hover:bg-red-900/30"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex min-h-[120px] items-center justify-center py-2">
                  <PlantIllustration
                    key={`${entry.goal.id}-${entry.stage.stage}-${entry.plantVariant}`}
                    stage={entry.stage.stage}
                    wateringLevel={entry.wateringLevel}
                    wateredGoals={entry.doneInCurrentWindow ? 1 : 0}
                    variant={entry.plantVariant}
                    playFinalStageAnimation={isFinalStage(entry.stage.stage, entry.plantVariant) && !hasPlayedFinalAnimationForGoal.current.has(entry.goal.id)}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  Streak: <span className="font-medium text-slate-900 dark:text-slate-200">{entry.streak}</span>{" "}
                  {effectiveTimesPerWeek(entry.goal) >= 7 ? "days" : "times"}
                  {entry.hasStreakOverride && (
                    <span className="ml-1 text-amber-700 dark:text-amber-300">
                      (real {entry.actualStreak})
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {entry.isOnBreak
                    ? "On break. Streak and growth are paused."
                    : entry.doneInCurrentWindow
                    ? "Watered this cycle."
                    : entry.canSubmitNow
                      ? "Needs water now."
                      : "Waiting for the next cycle."}
                </p>
                {entry.submissionWindowMessage && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{entry.submissionWindowMessage}</p>
                )}
                {entry.canSubmitNow && !entry.doneInCurrentWindow && !entry.submissionWindowMessage && (
                  <Link
                    href={`/goals/submit?goalId=${entry.goal.id}`}
                    className="mt-2 inline-flex rounded-md bg-prove-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-prove-700 btn-glass-primary"
                  >
                    Water now
                  </Link>
                )}

                <div className="mt-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Plant style
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {plantVariantsForPlan.map((variant) => {
                      const selected = variant === entry.plantVariant;
                      return (
                        <button
                          key={variant}
                          type="button"
                          onClick={() => {
                            if (canEditExistingGoalStyle) {
                              setGoalPlantVariant(entry.goal.id, variant);
                            } else if (!selected) {
                              setShowUpgradePrompt(true);
                            }
                          }}
                          className={`rounded-md border p-1 transition ${
                            selected
                              ? "border-emerald-500 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/40"
                              : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                          }`}
                          aria-label={`Set plant style ${variant}`}
                        >
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-slate-50 dark:bg-slate-900">
                            <PlantIllustration
                              stage="flowering"
                              wateringLevel={1}
                              wateredGoals={1}
                              size="small"
                              variant={variant}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editingGoalId === entry.goal.id && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-950/80">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Edit schedule & proof</p>

                    <div className="mt-3">
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Times per week</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        Daily reminders; due days spread automatically.
                      </p>
                      <div className="mt-2">
                        <TimesPerWeekControl
                          size="compact"
                          value={editDraft.timesPerWeek}
                          onChange={(n) => setEditDraft((prev) => ({ ...prev, timesPerWeek: n }))}
                        />
                      </div>
                    </div>

                    <label className="mt-3 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Daily reminder time
                      <input
                        type="time"
                        value={editDraft.reminderTime}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, reminderTime: e.target.value }))
                        }
                        className="mt-1 w-full max-w-[10rem] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>

                    <div className="mt-4 rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/50">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Photo proof</p>
                      <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                        You can only choose from AI suggestions for “{entry.goal.title}”. Refresh loads new options.
                      </p>
                      {editDraft.proofSuggestions.length >= 2 ? (
                        <ul className="mt-2 space-y-1.5">
                          {editDraft.proofSuggestions.map((s) => (
                            <li key={s}>
                              <label className="flex cursor-pointer gap-2 rounded border border-slate-200 bg-white/90 px-2 py-1.5 text-[11px] dark:border-slate-600 dark:bg-slate-900/50">
                                <input
                                  type="radio"
                                  name={`proof-req-${entry.goal.id}`}
                                  checked={editDraft.proofRequirement === s}
                                  onChange={() =>
                                    setEditDraft((prev) => ({ ...prev, proofRequirement: s }))
                                  }
                                  className="mt-0.5"
                                />
                                <span>{s}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                          No prompts loaded for this goal yet.
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={proofIdeasEditLoading}
                        onClick={() => void fetchProofIdeasForEdit(entry.goal.title)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-prove-700 hover:underline disabled:opacity-50 dark:text-prove-300"
                      >
                        {proofIdeasEditLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading…
                          </>
                        ) : (
                          "Refresh AI ideas"
                        )}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEditingGoal(entry.goal)}
                        disabled={isSavingEdit}
                        className="inline-flex items-center gap-1 rounded-md bg-prove-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-prove-700 disabled:opacity-70"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSavingEdit ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingGoal}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {isCreatorAccount && developerSettings.enabled && (
                  <div className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50/90 p-2 dark:border-amber-700/60 dark:bg-amber-950/30">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-900 dark:text-amber-200">
                      Dev streak override
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={goalStreakDrafts[entry.goal.id] ?? ""}
                        onChange={(e) => handleGoalStreakDraftChange(entry.goal.id, e.target.value)}
                        placeholder="Use real"
                        className="w-20 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-slate-500 dark:border-amber-700 dark:bg-amber-950/40 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => applyGoalStreakDraft(entry.goal.id)}
                        className="rounded-md bg-amber-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-800"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => clearGoalStreakDraft(entry.goal.id)}
                        className="rounded-md border border-amber-400 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Growth stages</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {PLANT_GROWTH_STAGES.map((stage) => (
              <li key={stage.stage}>
                • {stage.minStreak} {stage.minStreak === 1 ? "day" : "days"}: {stage.name}
              </li>
            ))}
            <li>• Final stage varies by plant style (flowers, cactus, etc.)</li>
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 block text-center text-sm text-prove-600 hover:underline dark:text-prove-400"
        >
          ← Back to dashboard
        </Link>
      </main>
      <UpgradePromptModal
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        title="Pro or Premium feature"
        message="Upgrade to Pro or Premium to use Goal Break and change plant styles."
      />
    </>
  );
}
