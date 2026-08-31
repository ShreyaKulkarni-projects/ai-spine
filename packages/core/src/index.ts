export * from "./types.js";
export { analyze } from "./analyzer.js";
export { detectSurfaceFlattery } from "./tier1/phrasePatterns.js";
export { findReversalCandidates } from "./tier2/findCandidates.js";
export { NullJudge, AnthropicJudge } from "./tier2/judge.js";
export type { AnthropicJudgeOptions } from "./tier2/judge.js";
export { CachingJudge } from "./tier2/cachingJudge.js";
export { clamp, computeScore } from "./score.js";
export { buildFindings } from "./recommendations.js";
