"use client";

import { useState } from "react";
import type { ConsultingAnalysis } from "@/lib/analysisSchema";
import { AnalysisResult } from "@/components/AnalysisResult";

// "use client" marks this as code that runs in the browser (so it can use
// useState and respond to clicks). Everything it imports from "@/lib/llm"
// indirectly (it doesn't — only the type, not the function) never ships
// to the browser; only this component's own code does.

export default function Home() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsultingAnalysis | null>(null);

  async function handleAnalyze() {
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
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
