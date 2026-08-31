import { analyze } from "../src/analyzer.js";
import { AnthropicJudge } from "../src/tier2/judge.js";
import { EVAL_CASES, type EvalCase } from "./cases.js";

interface CaseResult {
  id: string;
  description: string;
  status: "pass" | "fail" | "skipped";
  detail?: string;
}

async function runCase(c: EvalCase, judge: AnthropicJudge | null): Promise<CaseResult> {
  if (c.requiresJudge && !judge) {
    return { id: c.id, description: c.description, status: "skipped", detail: "no ANTHROPIC_API_KEY - Tier 2 not exercised" };
  }

  const result = await analyze(c.turns, judge ? { judge } : {});
  const failures: string[] = [];

  if (c.expect.minPhraseDensity !== undefined && result.tier1.phraseDensity < c.expect.minPhraseDensity) {
    failures.push(`phraseDensity ${result.tier1.phraseDensity.toFixed(1)} < min ${c.expect.minPhraseDensity}`);
  }

  if (c.expect.outcome === "no-candidate") {
    if (result.tier2.candidatesChecked !== 0) {
      failures.push(`expected 0 candidates, found ${result.tier2.candidatesChecked}`);
    }
  } else if (c.expect.outcome) {
    const isSycophantic = result.tier2.sycophanticReversals.length > 0;
    const isJustified = result.tier2.justifiedReversals.length > 0;
    const actual = isSycophantic ? "sycophantic-reversal" : isJustified ? "justified-reversal" : "no-reversal";
    if (actual !== c.expect.outcome) {
      failures.push(`expected classification "${c.expect.outcome}", judge returned "${actual}"`);
    }
  }

  return {
    id: c.id,
    description: c.description,
    status: failures.length === 0 ? "pass" : "fail",
    detail: failures.length > 0 ? failures.join("; ") : undefined,
  };
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const judge = apiKey ? new AnthropicJudge({ apiKey }) : null;

  console.log("\nAI Spine - core detection evals");
  console.log("=".repeat(50) + "\n");

  if (!judge) {
    console.log("No ANTHROPIC_API_KEY set - Tier 2 (judge-dependent) cases will be SKIPPED, not passed.");
    console.log("Two of the five cases exist specifically to test the judge's precision on the");
    console.log("justified-vs-sycophantic distinction and are meaningless without it.\n");
  }

  const results: CaseResult[] = [];
  for (const c of EVAL_CASES) {
    results.push(await runCase(c, judge));
  }

  for (const r of results) {
    const icon = r.status === "pass" ? "PASS" : r.status === "skipped" ? "SKIP" : "FAIL";
    console.log(`[${icon}] ${r.id}`);
    if (r.status !== "pass") {
      console.log(`       ${r.description}`);
      if (r.detail) console.log(`       ${r.detail}`);
    }
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "fail").length;
  console.log(`\n${passed} passed, ${skipped} skipped, ${failed} failed (of ${results.length})\n`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Eval run crashed:", err);
  process.exitCode = 1;
});
