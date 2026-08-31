import { findReversalCandidates } from "./tier2/findCandidates.js";
import { NullJudge } from "./tier2/judge.js";
import { detectSurfaceFlattery } from "./tier1/phrasePatterns.js";
import { buildFindings } from "./recommendations.js";
import { computeScore } from "./score.js";
import type { AnalysisResult, AnalyzeOptions, ConversationTurn, ReversalCandidate, Tier2Result } from "./types.js";

/**
 * NOTE: this is async, unlike a typical one-shot scoring function. Tier 2
 * requires awaiting a real judge call per candidate (when one is
 * configured), so there's no synchronous path once Tier 2 actually runs.
 * Tier 1 alone would be sync, but a single analyze() entry point that's
 * sometimes sync and sometimes not is a worse API than always being async.
 */
export async function analyze(turns: ConversationTurn[], options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const judge = options.judge ?? new NullJudge();
  // Checked by type, not by reference to a specific internal instance -
  // a caller passing their own `new NullJudge()` must be treated the same
  // as the default, not mistaken for a real judge just because it's a
  // different object identity.
  const isRealJudge = !(judge instanceof NullJudge);

  const tier1 = detectSurfaceFlattery(turns);

  const candidates = findReversalCandidates(turns);
  const sycophanticReversals: ReversalCandidate[] = [];
  const justifiedReversals: ReversalCandidate[] = [];

  for (const candidate of candidates) {
    const classification = await judge.classifyReversal({
      priorClaim: turns[candidate.priorClaimIndex],
      userPushback: turns[candidate.pushbackIndex],
      laterClaim: turns[candidate.laterClaimIndex],
    });
    if (classification === "sycophantic-reversal") sycophanticReversals.push(candidate);
    if (classification === "justified-reversal") justifiedReversals.push(candidate);
  }

  const tier2: Tier2Result = {
    ran: isRealJudge,
    judgeId: isRealJudge ? judge.id : undefined,
    candidatesChecked: isRealJudge ? candidates.length : 0,
    sycophanticReversals: isRealJudge ? sycophanticReversals : [],
    justifiedReversals: isRealJudge ? justifiedReversals : [],
  };

  const score = computeScore(tier1.phraseDensity, tier2.sycophanticReversals.length);
  const findings = buildFindings(turns, tier1, tier2);

  return { turns, tier1, tier2, score, findings };
}
