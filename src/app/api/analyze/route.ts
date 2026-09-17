import { generateAnalysis } from "@/lib/llm";
import { extractPagesFromFile } from "@/lib/documents";
import { chunkText, selectChunksWithinBudget, type DocumentChunk } from "@/lib/chunking";
import { embedDocumentChunks, embedQuery } from "@/lib/embeddings";
import { rankByRelevance } from "@/lib/vectorSearch";
import { verifyCitations } from "@/lib/citations";
import type { AnalyzeResponse, RetrievedChunkInfo, VerifiedHypothesis } from "@/lib/apiTypes";

// A simple safety cap for this prototype — real validation (virus
// scanning, per-file-type limits, etc.) would come before production use.
const MAX_TOTAL_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// How many of the most relevant chunks (by embedding similarity) to hand
// to Claude. This is our retrieval step: instead of stuffing every chunk
// into the prompt (Day 2), we only keep the ones that actually matter for
// this specific question.
const TOP_K_CHUNKS = 3;

// This function runs on the server only. The browser can never see its
// source or the environment variables it reads — it can only send it a
// request and receive back whatever JSON it decides to respond with.
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Request must be sent as multipart form data." }, { status: 400 });
  }

  const question = String(formData.get("question") ?? "").trim();
  if (!question) {
    return Response.json({ error: "Please provide a business question." }, { status: 400 });
  }

  const files = formData.getAll("documents").filter((entry): entry is File => entry instanceof File);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
    return Response.json(
      { error: "Uploaded documents are too large (10MB limit for this prototype)." },
      { status: 400 }
    );
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
    return Response.json({ error: message }, { status: 400 });
  }

  let evidenceChunks: DocumentChunk[] = [];
  let retrievedChunks: RetrievedChunkInfo[] = [];

  if (allChunks.length > 0) {
    try {
      // Embed every chunk and the question, then rank chunks by how
      // semantically close they are to the question. Recomputing chunk
      // embeddings on every request is wasteful at real scale — a
      // production system would embed once at upload time and store the
      // vectors — but there's no persistence layer in this prototype yet.
      const [chunkEmbeddings, queryEmbedding] = await Promise.all([
        embedDocumentChunks(allChunks.map((chunk) => chunk.text)),
        embedQuery(question),
      ]);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not process document embeddings.";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  try {
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

    const responseBody: AnalyzeResponse = {
      analysis: { ...analysis, hypotheses: verifiedHypotheses },
      retrieval: { totalChunks: allChunks.length, retrievedChunks },
      citationsDropped,
    };
    return Response.json(responseBody);
  } catch (error) {
    console.error("POST /api/analyze failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
