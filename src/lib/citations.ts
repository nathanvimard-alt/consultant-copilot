import type { Citation } from "./analysisSchema";
import type { DocumentChunk } from "./chunking";

export interface VerifiedCitation extends Citation {
  pageNumber: number | null;
}

// Collapses whitespace differences (line breaks, extra spaces) so a quote
// that's technically identical but reformatted still matches.
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

// We do not trust Claude's citations at face value. A model can "quote"
// something that sounds right but was never actually in the source text
// (a subtle form of hallucination). Here we check every claimed quote
// against the real chunk text we actually sent, and only keep citations
// that are genuinely, verifiably present — silently dropping the rest.
export function verifyCitations(
  citations: Citation[],
  evidenceChunks: DocumentChunk[]
): { verified: VerifiedCitation[]; droppedCount: number } {
  const verified: VerifiedCitation[] = [];
  let droppedCount = 0;

  for (const citation of citations) {
    const matchingChunk = evidenceChunks.find(
      (chunk) =>
        chunk.sourceName === citation.source_file &&
        normalize(chunk.text).includes(normalize(citation.quote))
    );

    if (matchingChunk) {
      verified.push({ ...citation, pageNumber: matchingChunk.pageNumber });
    } else {
      droppedCount += 1;
    }
  }

  return { verified, droppedCount };
}
