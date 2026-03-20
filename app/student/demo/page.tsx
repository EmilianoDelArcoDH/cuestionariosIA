'use client';

import { useState } from 'react';

type Outcome = 'correct' | 'partially_correct' | 'incorrect';

type EvaluationView = {
  result: Outcome;
  score: number;
  confidence: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  teacherReviewRecommended: boolean;
};

function badgeClasses(outcome: Outcome): string {
  switch (outcome) {
    case 'correct':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'partially_correct':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'incorrect':
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

function outcomeLabel(outcome: Outcome): string {
  switch (outcome) {
    case 'correct':
      return 'Correcta';
    case 'partially_correct':
      return 'Parcialmente correcta';
    case 'incorrect':
      return 'Incorrecta';
  }
}

export default function StudentDemoPage() {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationView | null>(null);
  const [rawResult, setRawResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  async function handleEvaluate() {
    setLoading(true);
    setError(null);
    setResult(null);
    setRawResult(null);
    setShowTechnical(false);
    try {
      const res = await fetch('/api/evaluate-example', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer })
      });

      if (!res.ok) {
        throw new Error('Error al evaluar la respuesta');
      }

      const data = await res.json();
      setRawResult(data);
      const view: EvaluationView = {
        result: data?.result ?? 'incorrect',
        score: typeof data?.score === 'number' ? data.score : 0,
        confidence: typeof data?.confidence === 'number' ? data.confidence : 0,
        matchedConcepts: Array.isArray(data?.matchedConcepts)
          ? data.matchedConcepts
          : [],
        missingConcepts: Array.isArray(data?.missingConcepts)
          ? data.missingConcepts
          : [],
        feedback:
          typeof data?.feedback === 'string'
            ? data.feedback
            : 'No se pudo generar feedback.',
        teacherReviewRecommended: Boolean(data?.teacherReviewRecommended)
      };
      setResult(view);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Error desconocido al evaluar'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] px-4 py-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="hero-panel rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.25fr,0.85fr]">
            <div className="space-y-4">
              <p className="section-label">Experiencia alumno</p>
              <h1
                className="text-3xl font-bold tracking-tight md:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Responde una pregunta abierta y mira la evaluacion al instante.
              </h1>
              <p className="text-sm leading-6 text-[var(--muted)] md:text-base">
                Esta demo combina una entrada clara, feedback estructurado y una lectura
                mas amigable del resultado.
              </p>
            </div>
            <div className="glass-panel rounded-[1.75rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Pregunta base
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                Como se compone una etiqueta ancla en HTML?
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Una buena respuesta suele mencionar la apertura, el cierre y el atributo{' '}
                <code>href</code>.
              </p>
            </div>
          </div>
        </section>

        <div className="glass-panel rounded-[2rem] p-6 space-y-4">
          <div className="rounded-[1.5rem] border border-[rgba(82,55,30,0.08)] bg-[rgba(255,252,247,0.7)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Tu respuesta
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Escribe libremente. La plataforma evaluara conceptos, no solo coincidencias exactas.
            </p>
          </div>
          <textarea
            className="field-shell min-h-[180px] text-sm leading-6"
            placeholder="Escribe tu respuesta aqui..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-[var(--muted)]">
              Consejo: menciona <code>&lt;a&gt;</code>, <code>&lt;/a&gt;</code> y el atributo{' '}
              <code>href</code>.
            </p>
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={loading || !answer.trim()}
              className="warm-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Evaluando...' : 'Enviar respuesta'}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {result && (
          <div className="glass-panel rounded-[2rem] p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeClasses(
                  result.result
                )}`}
              >
                {outcomeLabel(result.result)}
              </span>
              <div className="text-sm text-[var(--muted)]">
                <span className="font-semibold text-[var(--ink)]">
                  Puntaje: {result.score}/100
                </span>
                <span className="mx-2 text-[rgba(82,55,30,0.18)]">|</span>
                <span>Confianza: {Math.round(result.confidence * 100)}%</span>
              </div>
              {result.teacherReviewRecommended && (
                <span className="rounded-full border border-[rgba(82,55,30,0.1)] bg-[rgba(255,252,247,0.72)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                  Revision docente recomendada
                </span>
              )}
            </div>

            <div className="soft-card rounded-[1.5rem] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Feedback
              </p>
              <p className="text-sm leading-6 text-[var(--ink)]">{result.feedback}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="soft-card rounded-[1.5rem] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Conceptos detectados
                </p>
                {result.matchedConcepts.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    No se detectaron conceptos claros en tu respuesta.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {result.matchedConcepts.map((c) => (
                      <li
                        key={c}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="soft-card rounded-[1.5rem] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Conceptos faltantes
                </p>
                {result.missingConcepts.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    Bien: no faltan conceptos clave.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {result.missingConcepts.map((c) => (
                      <li
                        key={c}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTechnical((v) => !v)}
                className="ghost-button"
              >
                {showTechnical ? 'Ocultar detalles tecnicos' : 'Ver detalles tecnicos'}
              </button>
              {showTechnical && rawResult && (
                <pre className="mt-3 max-h-[320px] overflow-auto rounded-[1.5rem] border border-[rgba(82,55,30,0.14)] bg-[#21150f] p-4 text-xs text-amber-50">
                  {JSON.stringify(rawResult, null, 2) as string}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
