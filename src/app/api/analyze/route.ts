import { generateAnalysis } from "@/lib/llm";
import { extractTextFromFile } from "@/lib/documents";
import { chunkText, selectChunksWithinBudget, type DocumentChunk } from "@/lib/chunking";

// A simple safety cap for this prototype — real validation (virus
// scanning, per-file-type limits, etc.) would come before production use.
const MAX_TOTAL_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

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
      const text = await extractTextFromFile(file);
      allChunks = allChunks.concat(chunkText(text, file.name));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read one of the uploaded files.";
    return Response.json({ error: message }, { status: 400 });
  }

  const { selected: evidenceChunks, truncated } = selectChunksWithinBudget(allChunks);

  try {
    const analysis = await generateAnalysis(question, evidenceChunks, truncated);
    return Response.json(analysis);
  } catch (error) {
    console.error("POST /api/analyze failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
