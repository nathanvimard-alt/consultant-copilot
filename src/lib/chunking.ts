export interface DocumentChunk {
  sourceName: string;
  pageNumber: number | null;
  index: number;
  text: string;
}

const DEFAULT_CHUNK_SIZE = 1000; // characters
const DEFAULT_CHUNK_OVERLAP = 150; // characters

// Splits one page's text into overlapping windows. We overlap chunks so
// an idea that straddles a chunk boundary isn't cut in half and lost.
// Nothing here is ML — it's plain string slicing. Chunking happens one
// page at a time (never across a page boundary) so every chunk can be
// traced back to a single page for citations.
export function chunkText(
  text: string,
  sourceName: string,
  pageNumber: number | null,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP
): DocumentChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: DocumentChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push({ sourceName, pageNumber, index, text: normalized.slice(start, end) });
    index += 1;
    if (end === normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}

// Day 2 has no retrieval step yet (that's Day 3's embeddings + vector
// search), so we just include chunks in order until we hit a safety
// budget on how much evidence text we're willing to paste into one
// prompt. Hitting this limit is the concrete signal that "stuffing
// everything into the prompt" doesn't scale to real document sets.
const MAX_EVIDENCE_CHARS = 12000;

export function selectChunksWithinBudget(
  chunks: DocumentChunk[],
  maxChars = MAX_EVIDENCE_CHARS
): { selected: DocumentChunk[]; truncated: boolean } {
  const selected: DocumentChunk[] = [];
  let total = 0;

  for (const chunk of chunks) {
    if (total + chunk.text.length > maxChars) {
      return { selected, truncated: true };
    }
    selected.push(chunk);
    total += chunk.text.length;
  }

  return { selected, truncated: false };
}
