import Anthropic from "@anthropic-ai/sdk";
import { analysisJsonSchema, type ConsultingAnalysis } from "./analysisSchema";
import type { DocumentChunk } from "./chunking";

// This file only ever runs on the server (it's imported by a route handler,
// never by a "use client" component), so process.env.ANTHROPIC_API_KEY is
// read here and only here. It is never sent to the browser.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Kept in one place so swapping the LLM provider later only means
// changing this function, not every place that calls it.
export async function generateAnalysis(
  question: string,
  evidenceChunks: DocumentChunk[],
  evidenceTruncated: boolean
): Promise<ConsultingAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key."
    );
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(question, evidenceChunks, evidenceTruncated) }],
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

// Today there's no retrieval step: every chunk we were handed just gets
// pasted in as "evidence," labeled by source file. This is the simplest
// thing that works while documents are small demo files.
function buildUserMessage(
  question: string,
  chunks: DocumentChunk[],
  truncated: boolean
): string {
  if (chunks.length === 0) {
    return `Business question: ${question}\n\nNo client documents were provided for this question.`;
  }

  const evidenceBlock = chunks
    .map((chunk) => `[Source: ${chunk.sourceName}, excerpt ${chunk.index + 1}]\n${chunk.text}`)
    .join("\n\n---\n\n");

  const truncationNote = truncated
    ? "\n\n(Note: the uploaded documents were larger than this prototype's evidence budget, so only an initial portion is included above.)"
    : "";

  return `Business question: ${question}\n\nDocument excerpts provided as evidence:\n\n${evidenceBlock}${truncationNote}`;
}

const SYSTEM_PROMPT = `You are an AI research assistant supporting a management consultant during business problem diagnosis.

You may or may not be given excerpts from real client documents alongside the business question:

- If document excerpts ARE provided: treat them as the only ground-truth evidence available. For each hypothesis, set "evidence_alignment" to "supported_by_documents" if the excerpts support it, "contradicted_by_documents" if they contradict it, or "not_addressed_by_documents" if the excerpts are silent on it. Reference specific excerpts in your explanation when relevant. Do not treat your own general knowledge as evidence — only the excerpts count as evidence.
- If NO document excerpts are provided: set every hypothesis's "evidence_alignment" to "not_addressed_by_documents", and make clear in the executive summary that this analysis is based on general business reasoning only, not client-specific evidence.

Given a business question, you must:
- Propose multiple plausible, distinct hypotheses that could explain it — never settle on a single explanation.
- Clearly distinguish hypotheses (things that might be true) from established facts (things that are known). Do not present assumptions as if they were confirmed.
- For each hypothesis, explain why it is plausible, and specify what additional evidence would be needed to further confirm or rule it out.
- Recommend a concrete next analytical step for each hypothesis.
- Explicitly list the information gaps: specific data or documents a consultant would still need from the client to move forward, given what (if anything) was already provided.

Be concise and structured. Write like a consultant preparing a first-draft hypothesis tree for internal review, not a polished client deliverable.`;
