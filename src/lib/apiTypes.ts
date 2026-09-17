import type { ConsultingAnalysis, Hypothesis } from "./analysisSchema";
import type { VerifiedCitation } from "./citations";

export interface RetrievedChunkInfo {
  sourceName: string;
  pageNumber: number | null;
  index: number;
  score: number;
}

// The version of a Hypothesis we actually send to the frontend: citations
// have been checked against real source text and enriched with a real
// page number, rather than trusting whatever Claude self-reported.
export interface VerifiedHypothesis extends Omit<Hypothesis, "citations"> {
  citations: VerifiedCitation[];
}

export interface VerifiedAnalysis extends Omit<ConsultingAnalysis, "hypotheses"> {
  hypotheses: VerifiedHypothesis[];
}

export interface AnalyzeResponse {
  analysis: VerifiedAnalysis;
  retrieval: {
    totalChunks: number;
    retrievedChunks: RetrievedChunkInfo[];
  };
  citationsDropped: number;
}
