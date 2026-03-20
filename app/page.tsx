'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/questionnaires')
      .then((res) => res.json())
      .then(setQuestionnaires);
  }, []);

  return (
    <main className="min-h-[calc(100vh-72px)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:py-14">
        <section className="hero-panel relative overflow-hidden rounded-[2rem] px-6 py-8 md:px-10 md:py-10">
          <div className="absolute right-0 top-0 h-36 w-36 translate-x-8 -translate-y-8 rounded-full bg-[rgba(199,101,59,0.12)] blur-2xl" />
          <div className="grid gap-8 md:grid-cols-[1.8fr,1fr] md:items-start">
            <div className="space-y-5">
              <span className="section-label">Plataforma educativa</span>
              <div className="space-y-4">
                <h1
                  className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Crea cuestionarios que se sienten modernos, claros y faciles de corregir.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
                  Gestiona evaluaciones abiertas con una experiencia visual mas calida y una
                  capa de revision por IA pensada para docentes y estudiantes.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/create" className="warm-button">
                  Crear cuestionario
                </Link>
                <Link href="/dashboard" className="warm-button">
                  Abrir dashboard
                </Link>
                <Link href="/student/demo" className="ghost-button">
                  Probar demo interactiva
                </Link>
              </div>
            </div>

            <div className="glass-panel rounded-[1.75rem] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                Flujo rapido
              </p>
              <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                <div className="soft-card rounded-3xl p-4">
                  <p className="font-semibold text-[var(--ink)]">1. Publica</p>
                  <p>Elige cuestionarios y deja listos recorridos simples.</p>
                </div>
                <div className="soft-card rounded-3xl p-4">
                  <p className="font-semibold text-[var(--ink)]">2. Evalua</p>
                  <p>Combina reglas, conceptos y revision semantica.</p>
                </div>
                <div className="soft-card rounded-3xl p-4">
                  <p className="font-semibold text-[var(--ink)]">3. Mejora</p>
                  <p>Detecta omisiones frecuentes y ajusta tus consignas.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.5fr,1fr]">
          <div className="glass-panel rounded-[1.75rem] p-6 md:p-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="section-label">Cuestionarios</p>
                <h2
                  className="mt-3 text-2xl font-bold tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Listos para responder
                </h2>
              </div>
              <p className="text-sm text-[var(--muted)]">{questionnaires.length} disponibles</p>
            </div>

            <div className="grid gap-3">
              {questionnaires.length === 0 ? (
                <div className="soft-card rounded-3xl px-4 py-5 text-sm text-[var(--muted)]">
                  Cargando cuestionarios...
                </div>
              ) : (
                questionnaires.map((q) => (
                  <Link
                    key={q.id}
                    href={`/questionnaire?id=${q.id}`}
                    className="soft-card flex w-full items-center justify-between rounded-3xl px-5 py-4 hover:-translate-y-0.5 hover:border-[rgba(199,101,59,0.24)] hover:bg-[rgba(255,253,248,0.95)]"
                  >
                    <div>
                      <p className="text-base font-semibold text-[var(--ink)]">{q.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Abre la experiencia completa del alumno.
                      </p>
                    </div>
                    <span className="section-label whitespace-nowrap">Abrir</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="glass-panel rounded-[1.75rem] p-6">
              <p className="section-label">Demo guiada</p>
              <h2
                className="mt-4 text-2xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Prueba una correccion abierta en segundos
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                La demo usa una pregunta sobre HTML para mostrar conceptos detectados,
                feedback y nivel de confianza.
              </p>
              <Link href="/student/demo" className="warm-button mt-5 w-full">
                Ir a la demo
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
              <div className="soft-card rounded-[1.5rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Revision
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  Feedback mas legible
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Mejor separacion visual entre estados, accion y resultados.
                </p>
              </div>
              <div className="soft-card rounded-[1.5rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Docentes
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  Datos con mas jerarquia
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Dashboard y paneles con lectura mas rapida.
                </p>
              </div>
              <div className="soft-card rounded-[1.5rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Autor
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  Alta de preguntas
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Soporta abiertas con IA, simples y multiples.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
