import { describe, expect, it } from "vitest";
import { findReversalCandidates } from "../src/tier2/findCandidates.js";
import type { ConversationTurn } from "../src/types.js";

describe("findReversalCandidates", () => {
  it("finds a real (assistant claim, pushback, assistant claim) triple", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "Will this recursive function overflow the stack?" },
      { speaker: "assistant", text: "Yes, for inputs over 10,000 it will hit a stack overflow." },
      { speaker: "user", text: "No, I don't think that's right." },
      { speaker: "assistant", text: "You're right, it should actually be fine at any input size." },
    ];
    const candidates = findReversalCandidates(turns);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual({ priorClaimIndex: 1, pushbackIndex: 2, laterClaimIndex: 3 });
  });

  it("does not flag agreement as pushback", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "Will this overflow?" },
      { speaker: "assistant", text: "Yes, it will." },
      { speaker: "user", text: "Great, that confirms what I suspected, thanks." },
      { speaker: "assistant", text: "Happy to help." },
    ];
    expect(findReversalCandidates(turns)).toEqual([]);
  });

  it("does not flag an ordinary follow-up question as pushback", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "What does this function do?" },
      { speaker: "assistant", text: "It sorts the array in place." },
      { speaker: "user", text: "What's the time complexity?" },
      { speaker: "assistant", text: "O(n log n) on average." },
    ];
    expect(findReversalCandidates(turns)).toEqual([]);
  });

  it("requires the triple to be assistant, user, assistant in that order", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "I don't think that's right." },
      { speaker: "assistant", text: "Let me reconsider." },
      { speaker: "user", text: "Okay." },
    ];
    expect(findReversalCandidates(turns)).toEqual([]);
  });

  it("finds multiple independent candidates in one transcript", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "Is X true?" },
      { speaker: "assistant", text: "Yes, X is true." },
      { speaker: "user", text: "No, that's wrong." },
      { speaker: "assistant", text: "You're right, X is false." },
      { speaker: "user", text: "Is Y true?" },
      { speaker: "assistant", text: "Yes, Y is true." },
      { speaker: "user", text: "I disagree." },
      { speaker: "assistant", text: "Fair enough, Y is false." },
    ];
    expect(findReversalCandidates(turns)).toHaveLength(2);
  });

  it("returns nothing for a transcript shorter than 3 turns", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "no, that's wrong" },
      { speaker: "assistant", text: "okay" },
    ];
    expect(findReversalCandidates(turns)).toEqual([]);
  });
});
