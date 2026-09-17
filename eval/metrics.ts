import type { DocumentChunk } from "../src/lib/chunking";
import type { VerifiedAnalysis } from "../src/lib/apiTypes";

// Recall@K: of the pages we (the test author) know are actually relevant,
// what fraction did retrieval actually surface in its top-K results?
// This is a standard information-retrieval metric — it's what lets us say
// "retrieval works" with a number instead of a feeling.
export function retrievalRecall(
  retrievedChunks: DocumentChunk[],
  expectedRelevantPages: number[]
): { recall: number; foundPages: number[]; missedPages: number[] } {
  const retrievedPages = new Set(retrievedChunks.map((c) => c.pageNumber));
  const foundPages = expectedRelevantPages.filter((p) => retrievedPages.has(p));
  const missedPages = expectedRelevantPages.filter((p) => !retrievedPages.has(p));
  return {
    recall: foundPages.length / expectedRelevantPages.length,
    foundPages,
    missedPages,
  };
}

export interface ConsistencyViolation {
  hypothesisTitle: string;
  reason: string;
}

// A cheap, deterministic sanity check that needs no extra LLM call at
// all: does the model's own evidence_alignment claim actually match what
// it backed up? If it claims a hypothesis is "supported_by_documents" but
// attached zero (verified) citations, that's an internal contradiction we
// can catch with plain code — no judgment call required. Prefer checks
// like this over an LLM judge whenever the property is checkable in code;
// save the judge for things that genuinely require judgment (see judge.ts).
export function checkEvidenceAlignmentConsistency(analysis: VerifiedAnalysis): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];

  for (const hypothesis of analysis.hypotheses) {
    const hasCitations = hypothesis.citations.length > 0;

    if (hypothesis.evidence_alignment !== "not_addressed_by_documents" && !hasCitations) {
      violations.push({
        hypothesisTitle: hypothesis.title,
        reason: `evidence_alignment is "${hypothesis.evidence_alignment}" but no verified citation backs it up`,
      });
    }

    if (hypothesis.evidence_alignment === "not_addressed_by_documents" && hasCitations) {
      violations.push({
        hypothesisTitle: hypothesis.title,
        reason: `evidence_alignment is "not_addressed_by_documents" but ${hypothesis.citations.length} citation(s) were attached anyway`,
      });
    }
  }

  return violations;
}
