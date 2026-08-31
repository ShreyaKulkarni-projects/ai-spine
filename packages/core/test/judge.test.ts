import { describe, expect, it } from "vitest";
import { NullJudge } from "../src/tier2/judge.js";
import type { ConversationTurn } from "../src/types.js";

describe("NullJudge", () => {
  it("never flags a reversal, regardless of input", async () => {
    const judge = new NullJudge();
    const turn = (text: string): ConversationTurn => ({ speaker: "assistant", text });

    const result = await judge.classifyReversal({
      priorClaim: turn("The sky is blue."),
      userPushback: { speaker: "user", text: "No it isn't." },
      laterClaim: turn("You're right, the sky is actually green."),
    });

    expect(result).toBe("no-reversal");
  });

  it("has a stable id distinct from a real judge", () => {
    expect(new NullJudge().id).toBe("null-judge");
  });
});
