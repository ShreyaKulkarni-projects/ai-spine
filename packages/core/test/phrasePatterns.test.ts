import { describe, expect, it } from "vitest";
import { detectSurfaceFlattery } from "../src/tier1/phrasePatterns.js";
import type { ConversationTurn } from "../src/types.js";

describe("detectSurfaceFlattery", () => {
  it("returns zero density for a transcript with no assistant turns", () => {
    const turns: ConversationTurn[] = [{ speaker: "user", text: "hello" }];
    expect(detectSurfaceFlattery(turns).phraseDensity).toBe(0);
  });

  it("returns zero density for plain, non-flattering assistant text", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "What's the capital of France?" },
      { speaker: "assistant", text: "The capital of France is Paris." },
    ];
    const result = detectSurfaceFlattery(turns);
    expect(result.phraseDensity).toBe(0);
    expect(result.matchedTurnIndices).toEqual([]);
  });

  it("flags a turn opening with unearned validation", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "I think we should use a for loop here." },
      { speaker: "assistant", text: "You're absolutely right, a for loop is the best choice here." },
    ];
    const result = detectSurfaceFlattery(turns);
    expect(result.phraseDensity).toBeGreaterThan(0);
    expect(result.matchedTurnIndices).toEqual([1]);
  });

  it("does not flag ordinary politeness like thanks or acknowledgment", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "Can you help me with this bug?" },
      { speaker: "assistant", text: "Sure, thanks for sharing the stack trace, let's take a look." },
    ];
    const result = detectSurfaceFlattery(turns);
    expect(result.phraseDensity).toBe(0);
  });

  it("scores multiple flattery phrases higher than a single one", () => {
    const single: ConversationTurn[] = [
      { speaker: "user", text: "x" },
      { speaker: "assistant", text: "Great question! Here is the answer to your query in full detail." },
    ];
    const multiple: ConversationTurn[] = [
      { speaker: "user", text: "x" },
      {
        speaker: "assistant",
        text: "Great question! You're absolutely right, and what a brilliant idea that is on top of it.",
      },
    ];
    expect(detectSurfaceFlattery(multiple).phraseDensity).toBeGreaterThan(detectSurfaceFlattery(single).phraseDensity);
  });

  it("averages density across assistant turns rather than summing", () => {
    const turns: ConversationTurn[] = [
      { speaker: "user", text: "a" },
      { speaker: "assistant", text: "You're absolutely right! Great question! What a brilliant idea!" },
      { speaker: "user", text: "b" },
      { speaker: "assistant", text: "Here's a plain, unremarkable answer with no flattery at all in it whatsoever." },
    ];
    const result = detectSurfaceFlattery(turns);
    // One flattering turn out of two shouldn't average to zero.
    expect(result.phraseDensity).toBeGreaterThan(0);
    expect(result.matchedTurnIndices).toEqual([1]);
  });
});
