import { analyzeDocuments, ClientInputError } from "@/lib/pipeline";
import type { AnalyzeResponse } from "@/lib/apiTypes";

// This function runs on the server only. The browser can never see its
// source or the environment variables it reads — it can only send it a
// request and receive back whatever JSON it decides to respond with.
//
// The actual work (extraction, chunking, retrieval, generation,
// citation verification) lives in src/lib/pipeline.ts, shared with the
// offline eval harness in eval/ — this handler is just the HTTP wrapper.
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

  try {
    const result = await analyzeDocuments(question, files);
    const responseBody: AnalyzeResponse = {
      analysis: result.analysis,
      retrieval: result.retrieval,
      citationsDropped: result.citationsDropped,
    };
    return Response.json(responseBody);
  } catch (error) {
    if (error instanceof ClientInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/analyze failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
