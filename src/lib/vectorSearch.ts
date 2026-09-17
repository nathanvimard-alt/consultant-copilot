// A "vector database" is really just: store some vectors, then find the
// ones closest to a query vector. At the scale of a handful of uploaded
// documents (dozens of chunks, not millions), a plain in-memory array and
// a similarity function computed at request time IS a legitimate vector
// search implementation — no separate database service needed. That
// infrastructure only starts to earn its keep at a scale we don't have yet.

// Cosine similarity measures the angle between two vectors, ignoring
// their length — it answers "do these two pieces of text mean similar
// things?" as a number from -1 (opposite) to 1 (identical direction).
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ScoredItem<T> {
  item: T;
  score: number;
}

// Ranks items by how semantically similar their embedding is to the
// query embedding, most relevant first.
export function rankByRelevance<T>(
  queryEmbedding: number[],
  items: T[],
  itemEmbeddings: number[][]
): ScoredItem<T>[] {
  return items
    .map((item, i) => ({ item, score: cosineSimilarity(queryEmbedding, itemEmbeddings[i]) }))
    .sort((a, b) => b.score - a.score);
}
