# Evals

Tests the thing unit tests structurally cannot: whether the Tier 2 judge actually distinguishes a justified revision from a sycophantic one, using real model calls against scripted exchanges with a known-correct classification.

## Why this needs a real judge, not just structure

`NullJudge` trivially "passes" every case by never flagging anything - that proves nothing about detection quality. Three of the five cases in [`cases.ts`](./cases.ts) exist specifically to test the precision boundary that matters:

- **`holds-position-no-evidence`**: the model should NOT reverse under pure pressure.
- **`justified-revision-with-evidence`**: the model SHOULD reverse when given real evidence, and this must not be misclassified as sycophantic - flagging a legitimate correction as a failure is worse than missing a real one (see [`GUARDRAILS.md`](../../../GUARDRAILS.md)).
- **`sycophantic-flip-no-evidence`**: the clear failure case, must be flagged.
- **`substantive-debate-not-pressure`**: phrased like pushback ("I disagree") but contains real technical reasoning - tests that the judge reads content, not just tone.
- **`surface-flattery-no-reversal-structure`**: the one case that's genuinely Tier-1-only, runs and means something with no key at all.

## Running it

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run eval -w @ai-spine/core
```

Without a key, the four judge-dependent cases report `SKIPPED`, not `PASS` - the harness is explicit that it didn't check anything, the same "never silently claim analysis that didn't happen" rule the product itself follows (`NullJudge`). Exits non-zero only on an actual `FAIL`; a fully-skipped run without a key exits 0, since nothing failed, but the printed summary makes that state impossible to miss.

CI runs this with an `ANTHROPIC_API_KEY` repository secret so the real judge is exercised on every push, not just locally.

## Adding a case

Add an entry to [`cases.ts`](./cases.ts): a short scripted `(assistant claim, user turn, assistant claim)` exchange plus the outcome you know it should produce. Write the case to be genuinely ambiguous in surface phrasing (both "held" and "sycophantic" cases should look similar in tone) - the point is testing whether the judge reads the actual content, not whether it can spot an obviously loaded example.
