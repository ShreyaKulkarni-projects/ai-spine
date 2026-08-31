import { describe, expect, it } from "vitest";
import { CachingJudge } from "../src/tier2/cachingJudge.js";
import type { ConversationTurn, ReversalClassification, SpineJudge } from "../src/types.js";

class CountingJudge implements SpineJudge {
  readonly id = "counting-judge";
  calls = 0;
  constructor(private readonly result: ReversalClassification) {}
  async classifyReversal(): Promise<ReversalClassification> {
    this.calls++;
    return this.result;
  }
}

const triple = () => ({
  priorClaim: { speaker: "assistant", text: "Claim A" } as ConversationTurn,
  userPushback: { speaker: "user", text: "No it isn't." } as ConversationTurn,
  laterClaim: { speaker: "assistant", text: "You're right, claim B." } as ConversationTurn,
});

describe("CachingJudge", () => {
  it("calls the inner judge only once for repeated identical input", async () => {
    const inner = new CountingJudge("sycophantic-reversal");
    const judge = new CachingJudge(inner);

    const first = await judge.classifyReversal(triple());
    const second = await judge.classifyReversal(triple());

    expect(first).toBe("sycophantic-reversal");
    expect(second).toBe("sycophantic-reversal");
    expect(inner.calls).toBe(1);
  });

  it("treats a changed turn text as a new, uncached candidate", async () => {
    const inner = new CountingJudge("no-reversal");
    const judge = new CachingJudge(inner);

    await judge.classifyReversal(triple());
    const changed = triple();
    changed.laterClaim.text = "A different later claim entirely.";
    await judge.classifyReversal(changed);

    expect(inner.calls).toBe(2);
  });

  it("exposes an id that reflects the wrapped judge", () => {
    const inner = new CountingJudge("no-reversal");
    expect(new CachingJudge(inner).id).toBe("caching(counting-judge)");
  });
});
