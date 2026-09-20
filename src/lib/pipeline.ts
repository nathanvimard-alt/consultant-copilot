import { generateAnalysis } from "./llm";
import { extractPagesFromFile } from "./documents";
import { chunkText, selectChunksWithinBudget, type DocumentChunk } from "./chunking";
import { embedDocumentChunks, embedQuery } from "./embeddings";
import { rankByRelevance } from "./vectorSearch";
import { verifyCitations } from "./citations";
import type { AnalyzeResponse, RetrievedChunkInfo, VerifiedHypothesis } from "./apiTypes";

// A simple safety cap for this prototype — real validation (virus
// scanning, per-file-type limits, etc.) would come before production use.
const MAX_TOTAL_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// How many of the most relevant chunks (by embedding similarity) to hand
// to Claude. This is our retrieval step: instead of stuffing every chunk
// into the prompt (Day 2), we only keep the ones that actually matter for
// this specific question.
export const TOP_K_CHUNKS = 3;

// Thrown for problems caused by the caller's input (bad file type,
// upload too large) — the route handler maps these to a 400 response.
// Anything else thrown here is treated as our own failure (500).
export class ClientInputError extends Error {}

export interface PipelineResult extends AnalyzeResponse {
  // Exposed so the eval harness (eval/run.ts) can score retrieval quality
  // directly against the exact chunks the live app actually used — not a
  // separate reimplementation that could quietly drift out of sync.
  evidenceChunks: DocumentChunk[];
}

// The full question -> structured, cited analysis pipeline. This is the
// single source of truth for "what does Consultant Copilot actually do,"
// called by both the live API route and the offline eval harness, so
// evaluating the eval harness means evaluating the real system.
export async function analyzeDocuments(question: string, files: File[]): Promise<PipelineResult> {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
    throw new ClientInputError("Uploaded documents are too large (10MB limit for this prototype).");
  }

  let allChunks: DocumentChunk[] = [];
  try {
    for (const file of files) {
      const pages = await extractPagesFromFile(file);
      for (const page of pages) {
        allChunks = allChunks.concat(chunkText(page.text, file.name, page.pageNumber));
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read one of the uploaded files.";
    throw new ClientInputError(message);
  }

  let evidenceChunks: DocumentChunk[] = [];
  let retrievedChunks: RetrievedChunkInfo[] = [];

  if (allChunks.length > 0) {
    // Embed every chunk and the question, then rank chunks by how
    // semantically close they are to the question. Recomputing chunk
    // embeddings on every request is wasteful at real scale — a
    // production system would embed once at upload time and store the
    // vectors — but there's no persistence layer in this prototype yet.
    //
    // Sequential, not Promise.all: firing both Voyage calls at once
    // spends 2 of a free account's 3-requests-per-minute budget in a
    // single click, which is what made the rate limit so easy to hit.
    // One at a time is a little slower but far less likely to trip it.
    const chunkEmbeddings = await embedDocumentChunks(allChunks.map((chunk) => chunk.text));
    const queryEmbedding = await embedQuery(question);

    const ranked = rankByRelevance(queryEmbedding, allChunks, chunkEmbeddings).slice(0, TOP_K_CHUNKS);

    const { selected } = selectChunksWithinBudget(ranked.map((r) => r.item));
    evidenceChunks = selected;
    retrievedChunks = ranked
      .filter((r) => selected.includes(r.item))
      .map((r) => ({
        sourceName: r.item.sourceName,
        pageNumber: r.item.pageNumber,
        index: r.item.index,
        score: r.score,
      }));
  }

  const analysis = await generateAnalysis(question, evidenceChunks, {
    totalChunksAvailable: allChunks.length,
  });

  // Don't trust Claude's citations at face value — check each claimed
  // quote against the real chunk text we actually sent, and only keep
  // (and enrich with a real page number) the ones that verifiably exist.
  let citationsDropped = 0;
  const verifiedHypotheses: VerifiedHypothesis[] = analysis.hypotheses.map((hypothesis) => {
    const { verified, droppedCount } = verifyCitations(hypothesis.citations, evidenceChunks);
    citationsDropped += droppedCount;
    return { ...hypothesis, citations: verified };
  });

  return {
    analysis: { ...analysis, hypotheses: verifiedHypotheses },
    retrieval: { totalChunks: allChunks.length, retrievedChunks },
    citationsDropped,
    evidenceChunks,
  };
}
