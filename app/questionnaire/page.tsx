"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePgEvent } from "@/lib/hooks/usePgEvent";

function extractFeedbackScore(feedback: string): number | null {
  const match = feedback.match(
    /(\d{1,3})\s*\/\s*100|puntaje\s*:?\s*(\d{1,3})/i
  );
  const value = match?.[1] ?? match?.[2];

  return value ? Number(value) : null;
}

function FeedbackBadge({ feedback }: { feedback: string }) {
  let color =
    "border-[rgba(82,55,30,0.1)] bg-[rgba(255,252,247,0.78)] text-[var(--ink)]";
  let label = "Revision";
  const puntaje = extractFeedbackScore(feedback);

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

function ChoiceOption({
  checked,
  inputType,
  name,
  option,
  onChange,
}: {
  checked: boolean;
  inputType: "radio" | "checkbox";
  name?: string;
  option: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="soft-card grid cursor-pointer grid-cols-[auto,1fr] items-start gap-3 rounded-2xl px-4 py-3">
      <input
        type={inputType}
        name={name}
        value={option}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0"
      />
      <span className="field-shell block min-h-[56px] whitespace-pre-wrap break-words py-3 text-sm leading-6 text-[var(--ink)]">
        {option}
      </span>
    </label>
  );
}

function QuestionnaireContent() {
  const { postEvent } = usePgEvent();
  const searchParams = useSearchParams();
  const idq = searchParams.get("idq");
  const id = searchParams.get("id") || "1";
  const questionnaireParam = idq ? `idq=${idq}` : `id=${id}`;
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/questions?${questionnaireParam}`)
      .then((res) => res.json())
      .then((data) => {
        const loadedQuestions = Array.isArray(data?.questions) ? data.questions : [];
        setTitle(data?.title || `Cuestionario ${id}`);
        setQuestions(loadedQuestions);
        setAnswers(Array(loadedQuestions.length).fill(""));
        setFeedback(Array(loadedQuestions.length).fill(""));
        setSummary("");
        setError("");
      });
  }, [id, idq, questionnaireParam]);

  const handleChange = (idx: number, value: any) => {
    const newAnswers = [...answers];
    newAnswers[idx] = value;
    setAnswers(newAnswers);
    setError("");
  };

  const isAnswered = (question: any, answer: any) => {
    if (question.type === "open" || question.type === "single") {
      return typeof answer === "string" && answer.trim().length > 0;
    }

    if (question.type === "multiple") {
      return Array.isArray(answer) && answer.length > 0;
    }

    return false;
  };

  const missingCount = questions.filter(
    (question, idx) => !isAnswered(question, answers[idx])
  ).length;

  const handleEvaluate = async () => {
    setError("");
    setSummary("");

    const answeredQuestions = questions.map((question, idx) => ({
      questionId: question.id,
      question: question.text,
      answer: answers[idx],
    }));
    const failureReasons = questions
      .map((question, idx) =>
        isAnswered(question, answers[idx])
          ? null
          : `La pregunta ${idx + 1} está incompleta: ${question.text}`
      )
      .filter((reason): reason is string => reason !== null);

    if (failureReasons.length > 0) {
      const message = "El ejercicio está incompleto";
      setError(message);
      postEvent("FAILURE", message, failureReasons, {
        questionnaireId: idq ?? id,
        title,
        answers: answeredQuestions,
        approved: false,
        completed: false,
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answeredQuestions }),
      });
      const result = await res.json();

      if (!res.ok) {
        const message = result.error || "No se pudo evaluar el cuestionario.";
        setError(message);
        postEvent("FAILURE", message, [message], {
          questionnaireId: idq ?? id,
          title,
          answers: answeredQuestions,
          approved: false,
          completed: false,
        });
        return;
      }

      const evaluationFeedback = Array.isArray(result.feedback) ? result.feedback : [];
      const stateToPost = {
        questionnaireId: idq ?? id,
        title,
        answers: answeredQuestions.map((answer, idx) => ({
          ...answer,
          feedback: evaluationFeedback[idx] ?? "",
        })),
        score: typeof result.score === "number" ? result.score : null,
        approved: result.approved === true,
        completed: true,
      };

      setFeedback(evaluationFeedback);
      setSummary(result.summary || "");

      if (stateToPost.approved) {
        postEvent("SUCCESS", "Has completado y aprobado el ejercicio", [], stateToPost);
      } else {
        const failedAnswerReasons = evaluationFeedback
          .map((item: string, idx: number) => {
            const score = extractFeedbackScore(item);
            return score !== null && score < 70
              ? `Pregunta ${idx + 1}: ${item}`
              : null;
          })
          .filter((reason: string | null): reason is string => reason !== null);
        const failureReasonsFiltered = failedAnswerReasons.length > 0
          ? failedAnswerReasons
          : [result.summary || "El puntaje obtenido no alcanza el mínimo de aprobación."];

        postEvent(
          "FAILURE",
          "No has aprobado el ejercicio",
          failureReasonsFiltered,
          stateToPost
        );
      }
    } catch {
      const message = "No se pudo conectar con el servicio de evaluación.";
      setError(message);
      postEvent("FAILURE", message, [message], {
        questionnaireId: idq ?? id,
        title,
        answers: answeredQuestions,
        approved: false,
        completed: false,
      });
    } finally {
      setSubmitting(false);
    }
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
                {title || `Cuestionario ${id}`}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Responde cada punto.
              </p>
            </div>
            <div className="glass-panel rounded-[1.5rem] px-4 py-3 text-sm text-[var(--muted)] md:self-end">
              {questions.length} preguntas cargadas
            </div>
          </div>
        </section>

        {questions.length === 0 ? (
          <div className="glass-panel rounded-[1.75rem] px-5 py-4 text-sm text-[var(--muted)]">
            No hay preguntas en este cuestionario.
          </div>
        ) : (
          <>
            {questions.map((q, idx) => (
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
                      <ChoiceOption
                        key={optIdx}
                        inputType="radio"
                        name={`single-${idx}`}
                        option={opt}
                        checked={answers[idx] === opt}
                        onChange={() => handleChange(idx, opt)}
                      />
                    ))}
                  </div>
                )}

                {q.type === "multiple" && (
                  <div className="mb-2 space-y-2">
                    {q.options.map((opt: string, optIdx: number) => (
                      <ChoiceOption
                        key={optIdx}
                        inputType="checkbox"
                        option={opt}
                        checked={Array.isArray(answers[idx]) && answers[idx].includes(opt)}
                        onChange={(checked) => {
                          const prev = Array.isArray(answers[idx]) ? answers[idx] : [];
                          if (checked) {
                            handleChange(idx, [...prev, opt]);
                          } else {
                            handleChange(
                              idx,
                              prev.filter((v: string) => v !== opt)
                            );
                          }
                        }}
                      />
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

                {feedback[idx] && <FeedbackBadge feedback={feedback[idx]} />}
              </div>
            ))}

            <div className="glass-panel rounded-[1.75rem] p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Envio final del cuestionario
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {missingCount === 0
                      ? "Ya puedes enviar todas tus respuestas para evaluarlas juntas."
                      : `Faltan ${missingCount} pregunta${missingCount === 1 ? "" : "s"} por completar.`}
                  </p>
                </div>
                <button
                  className="warm-button"
                  onClick={handleEvaluate}
                  disabled={submitting}
                >
                  {submitting ? "Evaluando cuestionario..." : "Enviar cuestionario"}
                </button>
              </div>

              {error && (
                <p className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              {summary && (
                <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {summary}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function QuestionnairePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[calc(100vh-72px)] px-4 py-8 md:py-10">
          <div className="mx-auto max-w-4xl">
            <div className="glass-panel rounded-[1.75rem] px-5 py-4 text-sm text-[var(--muted)]">
              Cargando cuestionario...
            </div>
          </div>
        </main>
      }
    >
      <QuestionnaireContent />
    </Suspense>
  );
}
