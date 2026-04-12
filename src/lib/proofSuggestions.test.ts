import { describe, expect, it } from "vitest";
import {
  extractSuggestionStringsFromJson,
  mockProofSuggestionsForTitle,
  normalizeSuggestionList,
} from "./proofSuggestions";

describe("extractSuggestionStringsFromJson", () => {
  const two = ["A", "B"];
  const three = ["A", "B", "C"];

  it("reads suggestions array", () => {
    expect(extractSuggestionStringsFromJson({ suggestions: three })).toEqual(["A", "B", "C"]);
  });

  it("reads nested data.suggestions", () => {
    expect(extractSuggestionStringsFromJson({ data: { suggestions: two } })).toEqual(["A", "B"]);
  });

  it("reads prompts and ideas keys", () => {
    expect(extractSuggestionStringsFromJson({ prompts: two })).toEqual(["A", "B"]);
    expect(extractSuggestionStringsFromJson({ ideas: two })).toEqual(["A", "B"]);
  });

  it("reads top-level string array", () => {
    expect(extractSuggestionStringsFromJson(two)).toEqual(["A", "B"]);
  });

  it("reads array of { text } objects", () => {
    expect(
      extractSuggestionStringsFromJson([{ text: " One " }, { text: "Two" }, { text: "Three" }])
    ).toEqual(["One", "Two", "Three"]);
  });

  it("returns null for empty", () => {
    expect(extractSuggestionStringsFromJson({ suggestions: [] })).toBeNull();
    expect(extractSuggestionStringsFromJson({})).toBeNull();
  });
});

describe("normalizeSuggestionList", () => {
  it("requires min length", () => {
    expect(normalizeSuggestionList(["x"])).toBeNull();
    expect(normalizeSuggestionList(["x", "y"])).toEqual(["x", "y"]);
  });
});

describe("mockProofSuggestionsForTitle", () => {
  it("includes title", () => {
    const m = mockProofSuggestionsForTitle("Run");
    expect(m).toHaveLength(3);
    expect(m.every((s) => s.includes("Run"))).toBe(true);
  });
});
