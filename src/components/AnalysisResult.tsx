import type { EvidenceAlignment } from "@/lib/analysisSchema";
import type { AnalyzeResponse, VerifiedAnalysis } from "@/lib/apiTypes";

const EVIDENCE_BADGE_STYLES: Record<EvidenceAlignment, string> = {
  supported_by_documents:
    "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800",
  contradicted_by_documents:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800",
  not_addressed_by_documents:
    "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
};

const EVIDENCE_BADGE_ICONS: Record<EvidenceAlignment, string> = {
  supported_by_documents: "✓",
  contradicted_by_documents: "✕",
  not_addressed_by_documents: "–",
};

const EVIDENCE_BADGE_LABELS: Record<EvidenceAlignment, string> = {
  supported_by_documents: "Supported by documents",
  contradicted_by_documents: "Contradicted by documents",
  not_addressed_by_documents: "Not addressed by documents",
};

const EVIDENCE_CARD_ACCENT: Record<EvidenceAlignment, string> = {
  supported_by_documents: "border-l-green-400 dark:border-l-green-600",
  contradicted_by_documents: "border-l-red-400 dark:border-l-red-600",
  not_addressed_by_documents: "border-l-zinc-300 dark:border-l-zinc-700",
};

function locationLabel(sourceName: string, pageNumber: number | null): string {
  return pageNumber !== null ? `${sourceName}, page ${pageNumber}` : sourceName;
}

export function AnalysisResult({
  analysis,
  retrieval,
  citationsDropped,
}: {
  analysis: VerifiedAnalysis;
  retrieval: AnalyzeResponse["retrieval"] | null;
  citationsDropped: number;
}) {
  return (
    <div className="flex flex-col gap-8">
      <Section title="Executive Diagnosis" delay={0}>
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{analysis.executive_summary}</p>
        </div>
      </Section>

      <Section title="Hypotheses" delay={1}>
        <div className="flex flex-col gap-4">
          {analysis.hypotheses.map((hypothesis, index) => (
            <div
              key={index}
              className={`rounded-lg border border-l-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 shadow-sm transition-shadow hover:shadow-md ${EVIDENCE_CARD_ACCENT[hypothesis.evidence_alignment]}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {index + 1}. {hypothesis.title}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${EVIDENCE_BADGE_STYLES[hypothesis.evidence_alignment]}`}
                >
                  <span aria-hidden="true">{EVIDENCE_BADGE_ICONS[hypothesis.evidence_alignment]}</span>
                  {EVIDENCE_BADGE_LABELS[hypothesis.evidence_alignment]}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {hypothesis.explanation}
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  Evidence needed:
                </span>{" "}
                {hypothesis.potential_evidence}
              </p>
              {hypothesis.citations.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {hypothesis.citations.map((citation, citationIndex) => (
                    <blockquote
                      key={citationIndex}
                      className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 text-sm italic text-zinc-600 dark:text-zinc-400"
                    >
                      &ldquo;{citation.quote}&rdquo;
                      <footer className="mt-0.5 not-italic text-xs text-zinc-400 dark:text-zinc-500">
                        — {locationLabel(citation.source_file, citation.pageNumber)}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Information Gaps" delay={2}>
        <ul className="flex flex-col gap-1.5">
          {analysis.information_gaps.map((gap, index) => (
            <li key={index} className="flex gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              <span>{gap}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recommended Next Steps" delay={2}>
        <ul className="flex flex-col gap-1.5">
          {analysis.hypotheses.map((hypothesis, index) => (
            <li key={index} className="flex gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              <span>
                <span className="font-medium">{hypothesis.title}:</span>{" "}
                {hypothesis.recommended_next_step}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {retrieval && retrieval.retrievedChunks.length > 0 && (
        <Section title="Evidence Retrieved" delay={2}>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {retrieval.totalChunks > retrieval.retrievedChunks.length
              ? `Showing the ${retrieval.retrievedChunks.length} most relevant excerpt(s) out of ${retrieval.totalChunks} total, selected by semantic similarity to your question.`
              : `All ${retrieval.totalChunks} excerpt(s) from your uploaded documents were used.`}
            {citationsDropped > 0 &&
              ` ${citationsDropped} citation(s) proposed by the model could not be verified against the source excerpts and were omitted.`}
          </p>
          <ul className="flex flex-col gap-1">
            {retrieval.retrievedChunks.map((chunk, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span>
                  {locationLabel(chunk.sourceName, chunk.pageNumber)} — excerpt {chunk.index + 1}
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

const DELAY_CLASSES = ["animate-fade-in-up", "animate-fade-in-up-delay-1", "animate-fade-in-up-delay-2"];

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section className={DELAY_CLASSES[delay] ?? ""}>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
