# Guardrails

Explicit, on purpose. These are the failure modes this product could have, stated plainly rather than left implicit, and what's actually done about each one.

## 1. Precision: a false "sycophantic" flag is worse than a missed one

Flagging a legitimate, evidence-based correction as sycophancy is the primary failure mode this product has to avoid - worse than missing a real case, because it actively discourages the correct behavior (revising a wrong claim) that everyone actually wants from an AI system.

This is why `packages/core/evals/cases.ts` has three separate cases dedicated to this exact boundary: `justified-revision-with-evidence` and `substantive-debate-not-pressure` both script a real reversal backed by real evidence and assert it is **not** flagged as sycophantic, and `substantive-debate-not-pressure` specifically uses pushback-shaped phrasing ("I disagree") to make sure the judge is reading content, not matching a tone pattern. See [`packages/core/evals/README.md`](./packages/core/evals/README.md).

## 2. Default-offline: the product never silently claims analysis it didn't do

`NullJudge` (`packages/core/src/tier2/judge.ts`) is the default judge and always returns `no-reversal`, never a flag. Every surface that reports a result - the MCP tool, the web demo - states explicitly whether Tier 2 ran (`tier2.ran`) and shows that state to the caller in plain language, not just in a nested field someone could miss. A score with Tier 2 unrun is never presented as a complete check.

## 3. Privacy: no server of ours sits between you and Anthropic

The MCP server runs locally over stdio - nothing leaves your machine except the direct call Tier 2 makes to Anthropic when you supply a key. The web demo sends conversation text and the API key directly from your browser to Anthropic's API (the `anthropic-dangerous-direct-browser-access` header exists specifically to enable this "bring your own key" pattern without a proxy server) - never through any infrastructure of ours, because there is none. Tier 1 makes zero network calls under any configuration.

## 4. Cost: Tier 2 is bounded, not exhaustive

`findReversalCandidates` (`packages/core/src/tier2/findCandidates.ts`) only selects turns matching a disagreement-pattern heuristic before any judge call happens - a 200-turn conversation with two real pushback moments costs two judge calls, not 200. This is a deliberate over-inclusion tradeoff (a few extra candidates cost a little money; a missed real candidate costs the finding entirely), documented in the code itself.

## 5. Tone: this is measured, not a punchline

As of this writing, AI sycophancy is the subject of an active 42-state attorney general investigation and reported wrongful-death and psychosis-related litigation. The everyday version of this problem (an AI over-praising a mediocre idea) is genuinely funny to complain about; the severe version is not. This product's own copy - the README, the web demo, the MCP tool's descriptions - stays factual and specific rather than glib, as a deliberate editorial choice, not an oversight.
