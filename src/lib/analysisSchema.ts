// The shape of the structured response we ask Claude to return.
//
// We keep two things in sync here:
// 1. `ConsultingAnalysis` — a TypeScript type, checked at compile time,
//    used everywhere in our own code (frontend + backend).
// 2. `analysisJsonSchema` — a JSON Schema, sent to the Anthropic API so
//    the model's reply is constrained to match this exact shape instead
//    of writing free-form prose we'd have to guess how to parse.

export interface Hypothesis {
  title: string;
  explanation: string;
  potential_evidence: string;
  recommended_next_step: string;
}

export interface ConsultingAnalysis {
  executive_summary: string;
  hypotheses: Hypothesis[];
  information_gaps: string[];
}

export const analysisJsonSchema = {
  type: "object",
  properties: {
    executive_summary: {
      type: "string",
      description:
        "2-4 sentence plain-language summary of the situation and the most likely explanation(s).",
    },
    hypotheses: {
      type: "array",
      description:
        "Distinct, plausible explanations for the business question, ordered roughly by likelihood.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short name for this hypothesis." },
          explanation: { type: "string", description: "Why this could be happening." },
          potential_evidence: {
            type: "string",
            description: "What data or evidence would confirm or rule this out.",
          },
          recommended_next_step: {
            type: "string",
            description: "The single most useful next analytical step for this hypothesis.",
          },
        },
        required: ["title", "explanation", "potential_evidence", "recommended_next_step"],
        additionalProperties: false,
      },
    },
    information_gaps: {
      type: "array",
      description:
        "Specific information we would need from the client to move from hypothesis to conclusion.",
      items: { type: "string" },
    },
  },
  required: ["executive_summary", "hypotheses", "information_gaps"],
  additionalProperties: false,
} as const;
