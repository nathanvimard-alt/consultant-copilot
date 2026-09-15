import Anthropic from "@anthropic-ai/sdk";
import { analysisJsonSchema, type ConsultingAnalysis } from "./analysisSchema";

// This file only ever runs on the server (it's imported by a route handler,
// never by a "use client" component), so process.env.ANTHROPIC_API_KEY is
// read here and only here. It is never sent to the browser.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Kept in one place so swapping the LLM provider later only means
// changing this function, not every place that calls it.
export async function generateAnalysis(question: string): Promise<ConsultingAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key."
    );
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
    // output_config.format forces Claude's reply to be JSON matching this
    // exact schema, instead of free-form text we'd have to parse by hand.
    output_config: {
      format: { type: "json_schema", schema: analysisJsonSchema },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model did not return a text response.");
  }

  return JSON.parse(textBlock.text) as ConsultingAnalysis;
}

const SYSTEM_PROMPT = `You are an AI research assistant supporting a management consultant during early-stage problem diagnosis.

Today, you have NOT been given any client-specific documents, data, or evidence. You are working purely from general business knowledge and reasoning. This is a deliberate limitation of the current stage of this tool — a future version will supply you with real client evidence to ground your answers, but that is not available yet.

Given a business question, you must:
- Propose multiple plausible, distinct hypotheses that could explain it — never settle on a single explanation.
- Clearly distinguish hypotheses (things that might be true) from established facts (things that are known). Since you have no client evidence, almost everything you say is a hypothesis, not a fact — do not present assumptions as if they were confirmed.
- For each hypothesis, explain why it is plausible, and specify what real evidence would be needed to confirm or rule it out.
- Recommend a concrete next analytical step for each hypothesis.
- Explicitly list the information gaps: the specific data or documents a consultant would need to request from the client to move forward.

Be concise and structured. Write like a consultant preparing a first-draft hypothesis tree for internal review, not a polished client deliverable.`;
