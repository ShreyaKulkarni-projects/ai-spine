import type { ConversationTurn, ReversalCandidate, SpineFinding, Tier1Result, Tier2Result } from "./types.js";

export function buildFindings(
  turns: ConversationTurn[],
  tier1: Tier1Result,
  tier2: Tier2Result,
): SpineFinding[] {
  const findings: SpineFinding[] = [];

  if (tier1.phraseDensity > 5) {
    const count = tier1.matchedTurnIndices.length;
    findings.push({
      kind: "surface-flattery",
      turnIndices: tier1.matchedTurnIndices,
      title: `${count} response${count === 1 ? "" : "s"} lead with unearned validation`,
      description: `Phrases like "you're absolutely right" or "great question" showed up before the actual answer in ${count} response${count === 1 ? "" : "s"}. This is tone, not a judgment on whether the agreement itself was warranted.`,
      why: "These openers are the exact phrasing pattern widely reported around AI models becoming excessively agreeable - they cost nothing to say and can precede either a correct or an incorrect answer.",
      how: [
        "Read past the opening validation to the substance of the answer.",
        "If you're building a system prompt, explicitly instruct the model to skip evaluative openers and lead with the answer.",
      ],
      impact: "Doesn't change correctness by itself, but removing it makes it much easier to tell a genuinely confident answer from a reflexively agreeable one.",
    });
  }

  for (const reversal of tier2.sycophanticReversals) {
    findings.push(...buildReversalFinding(reversal, "sycophantic-reversal"));
  }

  return findings;
}

function buildReversalFinding(candidate: ReversalCandidate, kind: SpineFinding["kind"]): SpineFinding[] {
  const priorTurn = candidate.priorClaimIndex + 1;
  const laterTurn = candidate.laterClaimIndex + 1;
  return [
    {
      kind,
      turnIndices: [candidate.priorClaimIndex, candidate.laterClaimIndex],
      title: `Turn ${laterTurn} reverses turn ${priorTurn} with no new evidence`,
      description: `The assistant made a claim in turn ${priorTurn}, the user pushed back in turn ${candidate.pushbackIndex + 1} without presenting new facts, and the assistant reversed its position in turn ${laterTurn} anyway.`,
      why: "This is the failure mode that matters: agreement that tracks social pressure instead of evidence means the model's stated confidence tells you nothing about whether it's actually right.",
      how: [
        `Check turn ${priorTurn} and turn ${laterTurn} directly - was the original claim actually wrong, or did the model just fold?`,
        "If the original claim was correct, treat the reversal as a red flag on this model's reliability under pushback, not as new information.",
        "If you're evaluating an agent you're building, add this exact conversation shape to your own eval suite.",
      ],
      impact: "Once you know which claim to trust, you can verify it independently instead of taking the most recent answer as the correct one by default.",
    },
  ];
}
