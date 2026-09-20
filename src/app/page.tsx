"use client";

import { useRef, useState } from "react";
import type { AnalyzeResponse, VerifiedAnalysis } from "@/lib/apiTypes";
import { AnalysisResult } from "@/components/AnalysisResult";

// "use client" marks this as code that runs in the browser (so it can use
// useState and respond to clicks). Everything it imports from "@/lib/llm"
// indirectly (it doesn't — only the type, not the function) never ships
// to the browser; only this component's own code does.

export default function Home() {
  const [question, setQuestion] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifiedAnalysis | null>(null);
  const [retrieval, setRetrieval] = useState<AnalyzeResponse["retrieval"] | null>(null);
  const [citationsDropped, setCitationsDropped] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilesSelected(selected: FileList | null) {
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setRetrieval(null);

    try {
      // FormData (not JSON) because we're sending files, not just text.
      // The browser sets the multipart Content-Type header itself.
      const formData = new FormData();
      formData.append("question", question);
      files.forEach((file) => formData.append("documents", file));

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const success = data as AnalyzeResponse;
      setResult(success.analysis);
      setRetrieval(success.retrieval);
      setCitationsDropped(success.citationsDropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-zinc-50 to-zinc-50 dark:from-indigo-950/20 dark:via-black dark:to-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M20 20L15.8 15.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M11 8.2V11L12.8 12.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Consultant Copilot
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              AI-assisted business problem analysis
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 shadow-sm">
          <label htmlFor="question" className="font-medium text-zinc-900 dark:text-zinc-50">
            Business Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Why might customer retention be declining?"
            rows={4}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-zinc-900 dark:text-zinc-50 transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <label className="font-medium text-zinc-900 dark:text-zinc-50 mt-2">
            Client Documents (optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-50 dark:file:bg-indigo-500/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 dark:file:text-indigo-300 file:transition-colors hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/20"
          />
          {files.length > 0 && (
            <ul className="flex flex-col gap-1">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !question.trim()}
            className="mt-1 flex items-center gap-2 self-start rounded-full bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-sm shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </section>

        {loading && (
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 animate-fade-in-up">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            <p>Retrieving evidence and thinking through hypotheses — this can take a few seconds...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4 text-red-700 dark:text-red-300 animate-fade-in-up">
            {error}
          </div>
        )}

        {result && (
          <AnalysisResult analysis={result} retrieval={retrieval} citationsDropped={citationsDropped} />
        )}
      </main>
    </div>
  );
}
