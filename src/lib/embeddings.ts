import { VoyageAIClient } from "voyageai";

// This file only ever runs on the server, so VOYAGE_API_KEY is read here
// and only here — same rule as ANTHROPIC_API_KEY in llm.ts.
const MODEL = process.env.VOYAGE_MODEL || "voyage-4";

function getClient(): VoyageAIClient {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY is not set. Copy .env.example to .env.local and add your Voyage AI key to analyze uploaded documents."
    );
  }
  return new VoyageAIClient({ apiKey });
}

// Voyage distinguishes "document" embeddings (things you'll search over)
// from "query" embeddings (the search itself) and encodes them slightly
// differently under the hood — using the matching type on each side
// measurably improves how well semantically-similar pairs end up close
// together in vector space.
export async function embedDocumentChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  const response = await client.embed({ input: texts, model: MODEL, inputType: "document" });
  return (response.data ?? []).map((item) => item.embedding ?? []);
}

export async function embedQuery(text: string): Promise<number[]> {
  const client = getClient();
  const response = await client.embed({ input: text, model: MODEL, inputType: "query" });
  return response.data?.[0]?.embedding ?? [];
}
