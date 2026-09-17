// An OFFLINE eval: run against a fixed, hand-labeled test set, not the
// live app a user clicks through. This is what "evaluation" means for an
// LLM system — measuring quality systematically across many cases with a
// script, instead of eyeballing whatever one demo run happened to produce.
//
// Run with: npm run eval

process.loadEnvFile(".env.local");

import { readFileSync } from "node:fs";
import { analyzeDocuments } from "../src/lib/pipeline";
import { retrievalRecall, checkEvidenceAlignmentConsistency } from "./metrics";
import { judgeHedging } from "./judge";
import { evalCases } from "./testCases";

function loadFixtureAsFile(path: string): File {
  const buffer = readFileSync(path);
  const name = path.split("/").pop() ?? path;
  return new File([buffer], name);
}

async function main() {
  console.log(`Running ${evalCases.length} eval case(s)...\n`);

  let recallSum = 0;
  let citationsProposed = 0;
  let citationsVerified = 0;
  let consistencyViolations = 0;
  let judgePassed = 0;
  let erroredCases = 0;

  for (const testCase of evalCases) {
    console.log(`--- ${testCase.name} ---`);
    console.log(`Q: ${testCase.question}`);

    // Isolate each case: one flaky API call shouldn't throw away results
    // from every other case in the batch.
    try {
      const file = loadFixtureAsFile(testCase.fixturePath);
      // Calling the exact same function the live API route calls — this
      // eval exercises the real pipeline, not a reimplementation of it.
      const result = await analyzeDocuments(testCase.question, [file]);

      const { recall, foundPages, missedPages } = retrievalRecall(
        result.evidenceChunks,
        testCase.expectedRelevantPages
      );
      recallSum += recall;
      console.log(
        `  Retrieval recall: ${(recall * 100).toFixed(0)}%` +
          ` (found page(s) ${foundPages.join(", ") || "none"}` +
          `${missedPages.length ? `, missed ${missedPages.join(", ")}` : ""})`
      );

      const verifiedCount = result.analysis.hypotheses.reduce((sum, h) => sum + h.citations.length, 0);
      const proposedCount = verifiedCount + result.citationsDropped;
      citationsVerified += verifiedCount;
      citationsProposed += proposedCount;
      console.log(`  Citations verified: ${verifiedCount}/${proposedCount}`);

      const violations = checkEvidenceAlignmentConsistency(result.analysis);
      consistencyViolations += violations.length;
      console.log(
        violations.length === 0
          ? "  Consistency: OK"
          : `  Consistency: ${violations.length} violation(s) — ${violations
              .map((v) => `"${v.hypothesisTitle}" (${v.reason})`)
              .join("; ")}`
      );

      const judgment = await judgeHedging(testCase.question, result.analysis);
      if (judgment.pass) judgePassed += 1;
      console.log(`  Judge (appropriate hedging): ${judgment.pass ? "PASS" : "FAIL"} — ${judgment.reason}`);
    } catch (error) {
      erroredCases += 1;
      console.log(`  ERROR: ${error instanceof Error ? error.message : error}`);
    }
    console.log("");
  }

  const scoredCases = evalCases.length - erroredCases;
  console.log("=== Summary ===");
  if (erroredCases > 0) {
    console.log(`${erroredCases}/${evalCases.length} case(s) errored and were excluded from the averages below.`);
  }
  console.log(
    `Average retrieval recall: ${scoredCases > 0 ? ((recallSum / scoredCases) * 100).toFixed(0) + "%" : "n/a"}`
  );
  console.log(
    `Citation groundedness: ${citationsVerified}/${citationsProposed}` +
      (citationsProposed > 0 ? ` (${((citationsVerified / citationsProposed) * 100).toFixed(0)}%)` : "")
  );
  console.log(`Consistency violations: ${consistencyViolations}`);
  console.log(`Judge pass rate: ${judgePassed}/${scoredCases}`);
}

main().catch((error) => {
  console.error("Eval run failed:", error);
  process.exit(1);
});
