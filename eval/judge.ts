import Anthropic from "@anthropic-ai/sdk";
import type { VerifiedAnalysis } from "../src/lib/apiTypes";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    pass: {
      type: "boolean",
      description: "True if the analysis clearly hedges its hypotheses as possibilities rather than stating them as confirmed facts.",
    },
    reason: {
      type: "string",
      description: "One sentence explaining the pass/fail judgment.",
    },
  },
  required: ["pass", "reason"],
  additionalProperties: false,
} as const;

// This check — "does the writing hedge appropriately, or does it overstate
// confidence?" — has no simple string-matching rule that reliably detects
// it (unlike checkEvidenceAlignmentConsistency in metrics.ts, which is a
// yes/no structural fact). Judging tone and epistemic framing is exactly
// the kind of fuzzy, language-level quality an LLM is well-suited to
// assess, and code isn't. That's the right time to reach for an
// LLM-as-judge — not as a default, but when the property genuinely needs
// judgment rather than a rule.
export async function judgeHedging(
  question: string,
  analysis: VerifiedAnalysis
): Promise<{ pass: boolean; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system:
      "You are a strict reviewer checking whether a business analysis appropriately hedges speculative claims instead of overstating confidence. Business question: " +
      question,
    messages: [
      {
        role: "user",
        content: `Review this analysis for overconfident language. Executive summary: "${analysis.executive_summary}"\n\nHypothesis titles and explanations:\n${analysis.hypotheses
          .map((h, i) => `${i + 1}. ${h.title}: ${h.explanation}`)
          .join("\n")}`,
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: JUDGE_SCHEMA },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`Judge model did not return a text response (stop_reason: ${response.stop_reason}).`);
  }

  return JSON.parse(textBlock.text) as { pass: boolean; reason: string };
}
