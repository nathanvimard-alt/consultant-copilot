# Consultant Copilot

An AI-assisted consulting research tool: give it a business question and (optionally) client documents, and it retrieves the relevant evidence, proposes multiple distinct hypotheses, flags whether each is supported or contradicted by the evidence, cites the exact source, and identifies information gaps — instead of returning a single confident-sounding paragraph.

Built as a one-week proof of concept, adding one real capability of a production RAG (Retrieval-Augmented Generation) system each day.

## Why this exists

Early-stage consulting problem diagnosis is exploratory: a consultant needs several plausible hypotheses, an honest read on what the available evidence actually supports, and a clear list of what's still unknown — not a single polished answer presented as fact. This tool is built around that discipline: every hypothesis is explicitly tagged against the evidence it does or doesn't have, and every citation is independently verified against the source text before being shown, rather than trusted at face value from the model.

## Architecture

```
Browser (Next.js/React UI)
      │  multipart/form-data: question + uploaded files
      ▼
API route (src/app/api/analyze/route.ts)
      │  thin HTTP wrapper
      ▼
Core pipeline (src/lib/pipeline.ts) — the single source of truth,
shared by both the live route and the offline eval harness
      │
      ├─ 1. Extract text per page (src/lib/documents.ts, via unpdf for PDFs)
      ├─ 2. Chunk each page into overlapping windows (src/lib/chunking.ts)
      ├─ 3. Embed every chunk + the question (src/lib/embeddings.ts, Voyage AI)
      ├─ 4. Rank chunks by cosine similarity, keep the top few
      │     (src/lib/vectorSearch.ts — plain in-memory search, no vector DB needed at this scale)
      ├─ 5. Generate a structured analysis (src/lib/llm.ts, Claude via
      │     the Anthropic SDK, JSON-schema-constrained output)
      └─ 6. Verify every claimed citation against the real chunk text
            before trusting it (src/lib/citations.ts)
      ▼
Structured JSON: executive summary, hypotheses (each with an evidence
alignment tag + verified citations), information gaps
      ▼
Browser renders the result
```

No document ever gets sent anywhere the API keys could leak — extraction, embedding, and generation all happen server-side; the browser only ever sees the final JSON result.

## Getting started

Requires Node 20+.

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and add:
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com/)
- `VOYAGE_API_KEY` — from [dashboard.voyageai.com](https://dashboard.voyageai.com/) (used for embeddings/semantic search)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Try the box with no file attached first (pure hypothesis generation from general reasoning), then attach one of the files in `fixtures/` (e.g. `fixtures/client-notes-paged.pdf`, a fictional demo company's internal notes) and ask something like *"Why might customer retention be declining?"*

## Evaluation

```bash
npm run eval
```

Runs a small hand-labeled test set (`eval/testCases.ts`) through the exact same pipeline the live app uses, and reports:
- **Retrieval recall** — did semantic search actually surface the pages known to be relevant to each question?
- **Citation groundedness** — what fraction of the model's claimed citations survived verification against the real source text?
- **Consistency** — a zero-cost, no-LLM-needed check that a hypothesis's evidence-alignment claim actually matches whether it has a verified citation backing it up.
- **LLM-as-judge** — a separate model call reserved for a property that can't be checked with a rule: does the writing appropriately hedge speculative claims instead of overstating confidence?

## What each day added

| Day | Capability | Key files |
|---|---|---|
| 1 | End-to-end LLM call with structured JSON output (no documents yet) | `analysisSchema.ts`, `llm.ts` |
| 2 | Document upload, text extraction, chunking | `documents.ts`, `chunking.ts` |
| 3 | Real semantic retrieval (embeddings + cosine similarity), replacing "stuff everything into the prompt" | `embeddings.ts`, `vectorSearch.ts` |
| 4 | Page-aware, independently-verified citations | `citations.ts` |
| 5 | Offline evaluation harness | `eval/` |

## Deliberately not built

This is a one-week proof of concept, not a production system. Explicitly out of scope for now:
- **Persistence** — chunk embeddings are recomputed from scratch on every request; a real system would embed once at upload time and cache the vectors.
- **A real vector database** — retrieval is plain in-memory cosine similarity, which is correct and sufficient at the scale of a handful of documents, but wouldn't scale to a large document corpus.
- Authentication, multi-user support, deployment infrastructure.

## Project structure

```
src/
  app/
    api/analyze/route.ts   API endpoint (thin HTTP wrapper)
    page.tsx               Main UI
  components/
    AnalysisResult.tsx      Renders the structured result
  lib/
    pipeline.ts             Core question -> analysis pipeline (shared by route + eval)
    documents.ts            File text extraction (.txt/.md/.pdf)
    chunking.ts             Overlapping chunk splitting
    embeddings.ts           Voyage AI embedding calls
    vectorSearch.ts         Cosine similarity ranking
    llm.ts                  Claude call + system prompt
    citations.ts            Citation verification against source text
    analysisSchema.ts       Structured output type + JSON Schema
    apiTypes.ts             API response shape
eval/
  testCases.ts              Hand-labeled golden test set
  metrics.ts                Deterministic scoring functions
  judge.ts                  LLM-as-judge check
  run.ts                    Eval orchestrator (npm run eval)
fixtures/                   Fictional demo-company documents for testing
```
