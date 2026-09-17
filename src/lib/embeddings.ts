import { VoyageAIClient, VoyageAIError } from "voyageai";

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

// A free Voyage account with no payment method on file is capped at 3
// requests/minute (discovered by actually hitting it during Day 5's eval
// run, not guessed at ahead of time) — a single user clicking "Analyze"
// now and then rarely notices, but a script firing off several requests
// back-to-back (like eval/run.ts) hits it immediately. Rather than fail
// outright, wait out the rate-limit window and retry a couple of times.
const RATE_LIMIT_RETRY_DELAY_MS = 21_000;
const MAX_RETRIES = 2;

async function withRateLimitRetry<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      const isRateLimited = error instanceof VoyageAIError && error.statusCode === 429;
      if (!isRateLimited || attempt >= MAX_RETRIES) throw error;
      console.warn(
        `Voyage AI rate limit hit — waiting ${RATE_LIMIT_RETRY_DELAY_MS / 1000}s before retry ${attempt + 1}/${MAX_RETRIES}...`
      );
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
    }
  }
}

// Voyage distinguishes "document" embeddings (things you'll search over)
// from "query" embeddings (the search itself) and encodes them slightly
// differently under the hood — using the matching type on each side
// measurably improves how well semantically-similar pairs end up close
// together in vector space.
export async function embedDocumentChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  const response = await withRateLimitRetry(() =>
    client.embed({ input: texts, model: MODEL, inputType: "document" })
  );
  return (response.data ?? []).map((item) => item.embedding ?? []);
}

export async function embedQuery(text: string): Promise<number[]> {
  const client = getClient();
  const response = await withRateLimitRetry(() =>
    client.embed({ input: text, model: MODEL, inputType: "query" })
  );
  return response.data?.[0]?.embedding ?? [];
}
