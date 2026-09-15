import { generateAnalysis } from "@/lib/llm";

// This function runs on the server only. The browser can never see its
// source or the environment variables it reads — it can only send it a
// request and receive back whatever JSON it decides to respond with.
export async function POST(request: Request) {
  let question: string;
  try {
    const body = await request.json();
    question = typeof body?.question === "string" ? body.question.trim() : "";
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!question) {
    return Response.json({ error: "Please provide a business question." }, { status: 400 });
  }

  try {
    const analysis = await generateAnalysis(question);
    return Response.json(analysis);
  } catch (error) {
    console.error("POST /api/analyze failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
