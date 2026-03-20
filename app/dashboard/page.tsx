'use client';

import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { mutate: mutateCache } = useSWRConfig();
  const { data, error, isLoading } = useSWR('/api/dashboard/summary', fetcher);
  const {
    data: questionnaires,
    error: questionnairesError,
    isLoading: questionnairesLoading,
    mutate
  } = useSWR('/api/questionnaires', fetcher);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number, title: string) {
    const confirmed = window.confirm(
      `Vas a eliminar "${title}". Esta accion no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setDeleteError('');

    try {
      const response = await fetch(`/api/questionnaires/${id}`, {
        method: 'DELETE'
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo eliminar el cuestionario.');
      }

      await Promise.all([mutate(), mutateCache('/api/dashboard/summary')]);
    } catch (deleteActionError) {
      setDeleteError(
        deleteActionError instanceof Error
          ? deleteActionError.message
          : 'No se pudo eliminar el cuestionario.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] px-4 py-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="hero-panel rounded-[2rem] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-label">Panel docente</p>
              <h1
                className="mt-4 text-3xl font-bold tracking-tight md:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Observa rendimiento, errores y conceptos omitidos.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
                Una vista mas clara para detectar donde conviene reforzar consignas,
                contenido o criterios de correccion.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="ghost-button">
                Inicio
              </Link>
              <Link href="/create" className="ghost-button">
                Crear cuestionario
              </Link>
              <Link href="/student/demo" className="warm-button">
                Ver demo alumno
              </Link>
            </div>
          </div>
        </section>

        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">Resumen de actividad</h2>
          <p className="text-sm text-[var(--muted)]">
            Metricas presentadas con mayor contraste y mejor agrupacion.
          </p>
        </div>

        {isLoading && (
          <p className="glass-panel rounded-3xl px-4 py-3 text-sm text-[var(--muted)]">
            Cargando metricas...
          </p>
        )}
        {error && (
          <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Error al cargar datos del dashboard.
          </p>
        )}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="glass-panel rounded-[1.75rem] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Cuestionarios
                </p>
                <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--ink)]">
                  {data.quizzesCount}
                </p>
              </div>
              <div className="glass-panel rounded-[1.75rem] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Preguntas
                </p>
                <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--ink)]">
                  {data.questionsCount}
                </p>
              </div>
              <div className="glass-panel rounded-[1.75rem] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Intentos
                </p>
                <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--ink)]">
                  {data.attemptsCount}
                </p>
              </div>
              <div className="glass-panel rounded-[1.75rem] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Tasa aprobacion
                </p>
                <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--ink)]">
                  {Math.round(data.passRate * 100)}%
                </p>
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-[1.8fr,1.2fr]">
              <div className="glass-panel rounded-[1.75rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--ink)]">
                    Preguntas con mayor error
                  </h2>
                  <span className="section-label">Prioridad</span>
                </div>
                <ul className="space-y-3 text-sm text-[var(--ink)]">
                  {data.topErrorQuestions.length === 0 && (
                    <li className="soft-card rounded-2xl px-4 py-3 text-[var(--muted)]">
                      Aun no hay suficientes datos de respuestas.
                    </li>
                  )}
                  {data.topErrorQuestions.map((q: any) => (
                    <li
                      key={q.id}
                      className="soft-card flex items-center justify-between gap-4 rounded-2xl px-4 py-3"
                    >
                      <span className="line-clamp-2 font-medium">{q.title}</span>
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        {Math.round(q.errorRate * 100)}% error
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-panel rounded-[1.75rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--ink)]">
                    Conceptos omitidos
                  </h2>
                  <span className="section-label">Hallazgos</span>
                </div>
                <ul className="space-y-3 text-sm text-[var(--ink)]">
                  {data.mostMissingConcepts.length === 0 && (
                    <li className="soft-card rounded-2xl px-4 py-3 text-[var(--muted)]">
                      Aun no hay evaluaciones con conceptos omitidos.
                    </li>
                  )}
                  {data.mostMissingConcepts.map((c: any) => (
                    <li
                      key={c.concept}
                      className="soft-card flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                    >
                      <span className="font-medium">{c.concept}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {c.count} veces
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="glass-panel rounded-[1.75rem] p-6 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">
                    Gestion de cuestionarios
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    Aqui puedes ver todos los cuestionarios y decidir si abrirlos,
                    editarlos o eliminarlos.
                  </p>
                </div>
                <Link href="/create" className="warm-button">
                  Nuevo cuestionario
                </Link>
              </div>

              {questionnairesLoading && (
                <p className="soft-card rounded-2xl px-4 py-3 text-sm text-[var(--muted)]">
                  Cargando cuestionarios...
                </p>
              )}

              {(questionnairesError || deleteError) && (
                <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {deleteError || 'No se pudo cargar la lista de cuestionarios.'}
                </p>
              )}

              {Array.isArray(questionnaires) && questionnaires.length === 0 && (
                <p className="soft-card rounded-2xl px-4 py-3 text-sm text-[var(--muted)]">
                  Todavia no hay cuestionarios creados.
                </p>
              )}

              {Array.isArray(questionnaires) && questionnaires.length > 0 && (
                <div className="space-y-3">
                  {questionnaires.map((questionnaire: any) => (
                    <article
                      key={questionnaire.id}
                      className="soft-card flex flex-col gap-4 rounded-[1.5rem] px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-[var(--ink)]">
                          {questionnaire.title}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          {questionnaire.description || 'Sin descripcion'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/questionnaire?id=${questionnaire.id}`}
                          className="ghost-button"
                        >
                          Abrir
                        </Link>
                        <Link
                          href={`/edit/${questionnaire.id}`}
                          className="ghost-button"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
                          onClick={() =>
                            handleDelete(questionnaire.id, questionnaire.title)
                          }
                          disabled={deletingId === questionnaire.id}
                        >
                          {deletingId === questionnaire.id
                            ? 'Eliminando...'
                            : 'Eliminar'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
