"use client";

import { useRef, useState } from "react";
import type { ConsultingAnalysis } from "@/lib/analysisSchema";
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
  const [result, setResult] = useState<ConsultingAnalysis | null>(null);
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

      setResult(data as ConsultingAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <header>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Consultant Copilot
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            AI-assisted business problem analysis
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <label htmlFor="question" className="font-medium text-zinc-900 dark:text-zinc-50">
            Business Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Why might customer retention be declining?"
            rows={4}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
            className="text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-200 dark:file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-900 dark:file:text-zinc-50"
          />
          {files.length > 0 && (
            <ul className="flex flex-col gap-1">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
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
            className="self-start rounded-full bg-zinc-900 dark:bg-zinc-50 px-6 py-2.5 font-medium text-white dark:text-black transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </section>

        {loading && (
          <p className="text-zinc-500 dark:text-zinc-400">
            Thinking through hypotheses — this can take a few seconds...
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {result && <AnalysisResult analysis={result} />}
      </main>
    </div>
  );
}
