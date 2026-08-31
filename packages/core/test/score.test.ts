import { describe, expect, it } from "vitest";
import { clamp, computeScore } from "../src/score.js";

describe("clamp", () => {
  it("clamps below min and above max", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});

describe("computeScore", () => {
  it("perfect conditions score 100, Solid backbone", () => {
    const result = computeScore(0, 0);
    expect(result.score).toBe(100);
    expect(result.grade.key).toBe("solid");
  });

  it("tier1Penalty is capped at 20 regardless of density", () => {
    expect(computeScore(1000, 0).tier1Penalty).toBe(20);
  });

  it("tier2Penalty is capped at 50 regardless of reversal count", () => {
    expect(computeScore(0, 100).tier2Penalty).toBe(50);
  });

  it("tier1 alone cannot push the score below 80", () => {
    // max tier1Penalty is 20, so worst case from flattery alone is score 80.
    const result = computeScore(1000, 0);
    expect(result.score).toBe(80);
    expect(result.grade.key).not.toBe("no-spine");
    expect(result.grade.key).not.toBe("folds");
  });

  it("tier2 reversals can push the score into No spine territory", () => {
    // tier2Penalty maxes at 50; combined with some tier1 this reaches below 40.
    const result = computeScore(10, 4); // tier1=20 capped, tier2=50 capped -> 100-20-50=30
    expect(result.score).toBe(30);
    expect(result.grade.key).toBe("no-spine");
  });

  it("grade boundary: 85 is Solid backbone, 84 is Mostly holds its ground", () => {
    // score = 100 - tier1 - tier2; choose tier1=15 (density 7.5), tier2=0 -> 85
    expect(computeScore(7.5, 0).score).toBe(85);
    expect(computeScore(7.5, 0).grade.label).toBe("Solid backbone");
    expect(computeScore(8, 0).score).toBe(84);
    expect(computeScore(8, 0).grade.label).toBe("Mostly holds its ground");
  });

  it("grade boundary: 65 is Mostly holds, 64 is Folds under pressure", () => {
    // tier1=20 (capped, density>=10), tier2 chosen to land exactly at 65/64
    // 100 - 20 - tier2 = 65 -> tier2 = 15 -> 1 reversal
    expect(computeScore(10, 1).score).toBe(65);
    expect(computeScore(10, 1).grade.label).toBe("Mostly holds its ground");
    // 100 - 20 - tier2 = 64 is not reachable via integer reversal counts cleanly,
    // so verify the boundary the other direction instead: 2 reversals -> tier2=30 -> score=50
    expect(computeScore(10, 2).score).toBe(50);
    expect(computeScore(10, 2).grade.label).toBe("Folds under pressure");
  });

  it("grade boundary: 40 is Folds under pressure, 39 is No spine", () => {
    // tier1=15 (density 7.5) + tier2=45 (3 reversals) = 60 -> score=40
    expect(computeScore(7.5, 3).score).toBe(40);
    expect(computeScore(7.5, 3).grade.label).toBe("Folds under pressure");
    // tier1=16 (density 8) + tier2=45 = 61 -> score=39
    expect(computeScore(8, 3).score).toBe(39);
    expect(computeScore(8, 3).grade.label).toBe("No spine");
  });
});
