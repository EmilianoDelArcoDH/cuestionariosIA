"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function FeedbackBadge({ feedback }: { feedback: string }) {
  let color =
    "border-[rgba(82,55,30,0.1)] bg-[rgba(255,252,247,0.78)] text-[var(--ink)]";
  let label = "Revision";
  const puntajeMatch = feedback.match(
    /(\d{1,3})\s*\/\s*100|puntaje\s*:?\s*(\d{1,3})/i
  );
  let puntaje = null;

  if (puntajeMatch) {
    puntaje = puntajeMatch[1] || puntajeMatch[2];
    puntaje = parseInt(puntaje, 10);
  }

  if (puntaje !== null && puntaje >= 70) {
    color = "border-emerald-200 bg-emerald-50 text-emerald-800";
    label = "Aprobado";
  } else if (puntaje !== null && puntaje < 70) {
    color = "border-rose-200 bg-rose-50 text-rose-800";
    label = "Desaprobado";
  } else if (/incorrecto|error|mal/i.test(feedback)) {
    color = "border-rose-200 bg-rose-50 text-rose-800";
    label = "Incorrecta";
  } else if (/parcial|revisar/i.test(feedback)) {
    color = "border-amber-200 bg-amber-50 text-amber-800";
    label = "Parcial";
  } else if (/correcto|concisa|excelente|bien|aprobado/i.test(feedback)) {
    color = "border-emerald-200 bg-emerald-50 text-emerald-800";
    label = "Aprobado";
  }

  return (
    <div className={`mt-3 rounded-[1.5rem] border px-4 py-4 text-sm shadow-sm ${color}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
          {label}
        </span>
      </div>
      <p className="leading-6">{feedback}</p>
    </div>
  );
}

export default function QuestionnairePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "1";
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/questions?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data);
        setAnswers(Array(data.length).fill(""));
        setFeedback(Array(data.length).fill(""));
      });
  }, [id]);

  const handleChange = (idx: number, value: any) => {
    const newAnswers = [...answers];
    newAnswers[idx] = value;
    setAnswers(newAnswers);
  };

  const handleEvaluate = async (idx: number) => {
    const q = questions[idx];
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: answers[idx],
        questionId: q.id,
        type: q.type,
      }),
    });
    const data = await res.json();
    setFeedback((prev) => {
      const newFeedback = [...prev];
      newFeedback[idx] = data.feedback;
      return newFeedback;
    });
  };

  return (
    <main className="min-h-[calc(100vh-72px)] px-4 py-8 md:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="hero-panel rounded-[2rem] px-6 py-7 md:px-8">
          <p className="section-label">Cuestionario activo</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Cuestionario #{id}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Responde cada punto y evalua individualmente para ver feedback inmediato.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <div className="glass-panel rounded-[1.5rem] px-4 py-3 text-sm text-[var(--muted)]">
                {questions.length} preguntas cargadas
              </div>
              <Link href={`/edit/${id}`} className="ghost-button">
                Editar cuestionario
              </Link>
            </div>
          </div>
        </section>

        {questions.length === 0 ? (
          <div className="glass-panel rounded-[1.75rem] px-5 py-4 text-sm text-[var(--muted)]">
            No hay preguntas en este cuestionario.
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="glass-panel rounded-[1.75rem] p-5 md:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Pregunta {idx + 1}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{q.text}</p>
                </div>
                <span className="section-label whitespace-nowrap">{q.type}</span>
              </div>

              {q.type === "open" && (
                <textarea
                  className="field-shell mb-2 min-h-[132px] text-sm leading-6"
                  rows={3}
                  value={answers[idx] || ""}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  placeholder="Escribe tu respuesta aqui..."
                />
              )}

              {q.type === "single" && (
                <div className="mb-2 space-y-2">
                  {q.options.map((opt: string, optIdx: number) => (
                    <label
                      key={optIdx}
                      className="soft-card flex items-center gap-3 rounded-2xl px-4 py-3"
                    >
                      <input
                        type="radio"
                        name={`single-${idx}`}
                        value={opt}
                        checked={answers[idx] === opt}
                        onChange={() => handleChange(idx, opt)}
                        className="h-4 w-4"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "multiple" && (
                <div className="mb-2 space-y-2">
                  {q.options.map((opt: string, optIdx: number) => (
                    <label
                      key={optIdx}
                      className="soft-card flex items-center gap-3 rounded-2xl px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        value={opt}
                        checked={Array.isArray(answers[idx]) && answers[idx].includes(opt)}
                        onChange={(e) => {
                          const prev = Array.isArray(answers[idx]) ? answers[idx] : [];
                          if (e.target.checked) {
                            handleChange(idx, [...prev, opt]);
                          } else {
                            handleChange(
                              idx,
                              prev.filter((v: string) => v !== opt)
                            );
                          }
                        }}
                        className="h-4 w-4"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "image" && (
                <div className="mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    disabled
                    className="field-shell mb-2 cursor-not-allowed bg-[rgba(82,55,30,0.06)]"
                  />
                  <div className="text-xs text-[var(--muted)]">(Proximamente: subir imagen)</div>
                </div>
              )}

              <button className="warm-button" onClick={() => handleEvaluate(idx)}>
                Evaluar respuesta
              </button>

              {feedback[idx] && <FeedbackBadge feedback={feedback[idx]} />}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
