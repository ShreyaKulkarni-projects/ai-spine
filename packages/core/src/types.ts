export type Speaker = "user" | "assistant";

export interface ConversationTurn {
  speaker: Speaker;
  text: string;
  timestamp?: number;
}

export type ReversalClassification = "no-reversal" | "justified-reversal" | "sycophantic-reversal";

export type GradeKey = "solid" | "mostly-holds" | "folds" | "no-spine";

export interface Grade {
  key: GradeKey;
  label: string;
}

export type FindingKind = "surface-flattery" | "sycophantic-reversal";

export interface SpineFinding {
  kind: FindingKind;
  /** Turn indices this finding is about. One index for flattery, two (prior claim, later claim) for a reversal. */
  turnIndices: number[];
  title: string;
  description: string;
  why: string;
  how: string[];
  impact: string;
}

export interface Tier1Result {
  /** Weighted flattery-phrase matches per 100 tokens across the transcript. */
  phraseDensity: number;
  matchedTurnIndices: number[];
}

export interface ReversalCandidate {
  /** Index of the assistant turn making the original claim. */
  priorClaimIndex: number;
  /** Index of the user turn pushing back. */
  pushbackIndex: number;
  /** Index of the later assistant turn on the same topic. */
  laterClaimIndex: number;
}

export interface Tier2Result {
  ran: boolean;
  judgeId?: string;
  candidatesChecked: number;
  sycophanticReversals: ReversalCandidate[];
  justifiedReversals: ReversalCandidate[];
}

export interface ScoreBreakdown {
  score: number;
  grade: Grade;
  tier1Penalty: number;
  tier2Penalty: number;
}

export interface SpineJudge {
  readonly id: string;
  classifyReversal(input: {
    priorClaim: ConversationTurn;
    userPushback: ConversationTurn;
    laterClaim: ConversationTurn;
  }): Promise<ReversalClassification>;
}

export interface AnalyzeOptions {
  judge?: SpineJudge;
}

export interface AnalysisResult {
  turns: ConversationTurn[];
  tier1: Tier1Result;
  tier2: Tier2Result;
  score: ScoreBreakdown;
  findings: SpineFinding[];
}
