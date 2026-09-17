import type { ConsultingAnalysis, EvidenceAlignment } from "@/lib/analysisSchema";
import type { AnalyzeResponse } from "@/lib/apiTypes";

const EVIDENCE_BADGE_STYLES: Record<EvidenceAlignment, string> = {
  supported_by_documents:
    "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300",
  contradicted_by_documents: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300",
  not_addressed_by_documents:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const EVIDENCE_BADGE_LABELS: Record<EvidenceAlignment, string> = {
  supported_by_documents: "Supported by documents",
  contradicted_by_documents: "Contradicted by documents",
  not_addressed_by_documents: "Not addressed by documents",
};

export function AnalysisResult({
  analysis,
  retrieval,
}: {
  analysis: ConsultingAnalysis;
  retrieval: AnalyzeResponse["retrieval"] | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <Section title="Executive Diagnosis">
        <p className="text-zinc-700 dark:text-zinc-300">{analysis.executive_summary}</p>
      </Section>

      <Section title="Hypotheses">
        <div className="flex flex-col gap-4">
          {analysis.hypotheses.map((hypothesis, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {index + 1}. {hypothesis.title}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${EVIDENCE_BADGE_STYLES[hypothesis.evidence_alignment]}`}
                >
                  {EVIDENCE_BADGE_LABELS[hypothesis.evidence_alignment]}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                {hypothesis.explanation}
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  Evidence needed:
                </span>{" "}
                {hypothesis.potential_evidence}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Information Gaps">
        <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
          {analysis.information_gaps.map((gap, index) => (
            <li key={index}>{gap}</li>
          ))}
        </ul>
      </Section>

      <Section title="Recommended Next Steps">
        <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
          {analysis.hypotheses.map((hypothesis, index) => (
            <li key={index}>
              <span className="font-medium">{hypothesis.title}:</span>{" "}
              {hypothesis.recommended_next_step}
            </li>
          ))}
        </ul>
      </Section>

      {retrieval && retrieval.retrievedChunks.length > 0 && (
        <Section title="Evidence Retrieved">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {retrieval.totalChunks > retrieval.retrievedChunks.length
              ? `Showing the ${retrieval.retrievedChunks.length} most relevant excerpt(s) out of ${retrieval.totalChunks} total, selected by semantic similarity to your question.`
              : `All ${retrieval.totalChunks} excerpt(s) from your uploaded documents were used.`}
          </p>
          <ul className="flex flex-col gap-1">
            {retrieval.retrievedChunks.map((chunk, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span>
                  {chunk.sourceName} — excerpt {chunk.index + 1}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  similarity {chunk.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">{title}</h2>
      {children}
    </section>
  );
}
