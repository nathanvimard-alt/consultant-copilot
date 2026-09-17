// The shape of the structured response we ask Claude to return.
//
// We keep two things in sync here:
// 1. `ConsultingAnalysis` — a TypeScript type, checked at compile time,
//    used everywhere in our own code (frontend + backend).
// 2. `analysisJsonSchema` — a JSON Schema, sent to the Anthropic API so
//    the model's reply is constrained to match this exact shape instead
//    of writing free-form prose we'd have to guess how to parse.

export type EvidenceAlignment =
  | "supported_by_documents"
  | "contradicted_by_documents"
  | "not_addressed_by_documents";

// What Claude claims a quote's provenance is. We deliberately do NOT ask
// it for a page number here — we compute that ourselves during citation
// verification, from our own trusted chunk records, rather than trusting
// the model to correctly recall and report that metadata.
export interface Citation {
  source_file: string;
  quote: string;
}

export interface Hypothesis {
  title: string;
  explanation: string;
  evidence_alignment: EvidenceAlignment;
  potential_evidence: string;
  recommended_next_step: string;
  citations: Citation[];
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
          evidence_alignment: {
            type: "string",
            enum: ["supported_by_documents", "contradicted_by_documents", "not_addressed_by_documents"],
            description:
              "Whether the provided document excerpts support, contradict, or say nothing about this hypothesis. Use 'not_addressed_by_documents' when no documents were provided at all.",
          },
          potential_evidence: {
            type: "string",
            description: "What additional data or evidence would confirm or rule this out.",
          },
          recommended_next_step: {
            type: "string",
            description: "The single most useful next analytical step for this hypothesis.",
          },
          citations: {
            type: "array",
            description:
              "1-2 short quotes (each under 200 characters) copied EXACTLY, character-for-character, from the provided document excerpts that support or contradict this hypothesis. Do not paraphrase or summarize — copy verbatim. Leave this empty if evidence_alignment is 'not_addressed_by_documents' or no documents were provided.",
            items: {
              type: "object",
              properties: {
                source_file: {
                  type: "string",
                  description: "The exact source filename this quote was copied from, as shown in the excerpt label.",
                },
                quote: {
                  type: "string",
                  description: "An exact, verbatim quote copied character-for-character from the excerpt text.",
                },
              },
              required: ["source_file", "quote"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "title",
          "explanation",
          "evidence_alignment",
          "potential_evidence",
          "recommended_next_step",
          "citations",
        ],
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
