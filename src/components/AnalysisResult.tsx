import type { ConsultingAnalysis } from "@/lib/analysisSchema";

export function AnalysisResult({ analysis }: { analysis: ConsultingAnalysis }) {
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
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {index + 1}. {hypothesis.title}
              </h3>
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
