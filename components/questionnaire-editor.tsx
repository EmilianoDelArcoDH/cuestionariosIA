'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type QuestionType = 'open' | 'single' | 'multiple';

type DraftQuestion = {
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswers: string[];
  modelAnswer: string;
  keyConcepts: string;
  expectedExpressions: string;
};

type QuestionnaireEditorData = {
  id?: number;
  title: string;
  description: string;
  questions: DraftQuestion[];
};

type QuestionnaireEditorProps = {
  mode: 'create' | 'edit';
  initialData?: QuestionnaireEditorData;
};

function createEmptyQuestion(type: QuestionType = 'open'): DraftQuestion {
  return {
    text: '',
    type,
    options: type === 'open' ? [] : ['', ''],
    correctAnswers: [],
    modelAnswer: '',
    keyConcepts: '',
    expectedExpressions: ''
  };
}

function mapIncomingQuestion(question: any): DraftQuestion {
  return {
    text: question?.text ?? '',
    type: question?.type ?? 'open',
    options: Array.isArray(question?.options) ? question.options : [],
    correctAnswers: Array.isArray(question?.choiceConfig?.correctAnswers)
      ? question.choiceConfig.correctAnswers
      : [],
    modelAnswer: question?.openConfig?.modelAnswer ?? '',
    keyConcepts: Array.isArray(question?.openConfig?.keyConcepts)
      ? question.openConfig.keyConcepts.join(', ')
      : '',
    expectedExpressions: Array.isArray(question?.openConfig?.expectedExpressions)
      ? question.openConfig.expectedExpressions.join(', ')
      : ''
  };
}

export function QuestionnaireEditor({
  mode,
  initialData
}: QuestionnaireEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    initialData?.questions?.length
      ? initialData.questions.map(mapIncomingQuestion)
      : [createEmptyQuestion()]
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  function normalizeClosedQuestion(question: DraftQuestion, type: QuestionType): DraftQuestion {
    if (type === 'open') {
      return {
        ...question,
        type,
        options: [],
        correctAnswers: []
      };
    }

    const nextOptions = question.options.length >= 2 ? question.options : ['', ''];
    const validCorrectAnswers = question.correctAnswers.filter((answer) =>
      nextOptions.includes(answer)
    );

    return {
      ...question,
      type,
      options: nextOptions,
      correctAnswers:
        type === 'single' ? validCorrectAnswers.slice(0, 1) : validCorrectAnswers
    };
  }

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    );
  }

  function addQuestion(type: QuestionType) {
    setQuestions((current) => [...current, createEmptyQuestion(type)]);
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index));
  }

  function updateOption(index: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        const previousValue = question.options[optionIndex] ?? '';
        const options = question.options.map((option, currentOptionIndex) =>
          currentOptionIndex === optionIndex ? value : option
        );
        const correctAnswers = question.correctAnswers.map((answer) =>
          answer === previousValue ? value : answer
        );

        return {
          ...question,
          options,
          correctAnswers
        };
      })
    );
  }

  function addOption(index: number) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index
          ? {
              ...question,
              options: [...question.options, '']
            }
          : question
      )
    );
  }

  function removeOption(index: number, optionIndex: number) {
    setQuestions((current) =>
      current.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        const removedValue = question.options[optionIndex];
        const options = question.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex);

        return {
          ...question,
          options,
          correctAnswers: question.correctAnswers.filter((answer) => answer !== removedValue)
        };
      })
    );
  }

  function toggleCorrectAnswer(index: number, option: string, checked: boolean) {
    setQuestions((current) =>
      current.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        if (question.type === 'single') {
          return {
            ...question,
            correctAnswers: checked ? [option] : []
          };
        }

        return {
          ...question,
          correctAnswers: checked
            ? [...question.correctAnswers, option]
            : question.correctAnswers.filter((answer) => answer !== option)
        };
      })
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isEdit = mode === 'edit' && initialData?.id;
      const response = await fetch(
        isEdit ? `/api/questionnaires/${initialData.id}` : '/api/questionnaires',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            description,
            questions
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEdit
              ? 'No se pudo actualizar el cuestionario.'
              : 'No se pudo crear el cuestionario.')
        );
      }

      router.push(`/questionnaire?id=${data.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : mode === 'edit'
            ? 'No se pudo actualizar el cuestionario.'
            : 'No se pudo crear el cuestionario.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id) {
      return;
    }

    const confirmed = window.confirm(
      'Vas a eliminar este cuestionario completo. Esta accion no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/questionnaires/${initialData.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo eliminar el cuestionario.');
      }

      router.push('/');
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el cuestionario.'
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] px-4 py-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="hero-panel rounded-[2rem] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-label">
                {mode === 'edit' ? 'Edicion completa' : 'Nueva autoria'}
              </p>
              <h1
                className="mt-4 text-3xl font-bold tracking-tight md:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {mode === 'edit'
                  ? 'Edita preguntas, respuestas y configuracion del cuestionario.'
                  : 'Crea cuestionarios con preguntas abiertas, simples y multiples.'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
                {mode === 'edit'
                  ? 'Puedes cambiar titulo, descripcion, preguntas, opciones y respuestas correctas en un solo guardado.'
                  : 'Define el enunciado, las respuestas correctas y, para preguntas abiertas, la referencia que usara la evaluacion por IA.'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard" className="ghost-button">
                Volver al dashboard
              </Link>
              {mode === 'edit' && initialData?.id && (
                <Link href={`/questionnaire?id=${initialData.id}`} className="ghost-button">
                  Ver cuestionario
                </Link>
              )}
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="glass-panel rounded-[2rem] p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Datos generales
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">
                Configuracion del cuestionario
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">Titulo</span>
                <input
                  className="field-shell"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Introduccion a HTML"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">Descripcion</span>
                <input
                  className="field-shell"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Breve resumen del cuestionario"
                />
              </label>
            </div>
          </section>

          <section className="glass-panel rounded-[2rem] p-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Preguntas
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">
                  Construye el cuestionario
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => addQuestion('open')}
                >
                  Agregar abierta
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => addQuestion('single')}
                >
                  Agregar simple
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => addQuestion('multiple')}
                >
                  Agregar multiple
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <article key={index} className="soft-card rounded-[1.75rem] p-5 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Pregunta {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Tipo actual: {question.type}
                      </p>
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => removeQuestion(index)}
                      >
                        Eliminar pregunta
                      </button>
                    )}
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--ink)]">Enunciado</span>
                    <textarea
                      className="field-shell min-h-[110px]"
                      value={question.text}
                      onChange={(event) =>
                        updateQuestion(index, { text: event.target.value })
                      }
                      placeholder="Escribe la consigna"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--ink)]">Tipo de pregunta</span>
                    <select
                      className="field-shell"
                      value={question.type}
                      onChange={(event) =>
                        setQuestions((current) =>
                          current.map((currentQuestion, questionIndex) =>
                            questionIndex === index
                              ? normalizeClosedQuestion(
                                  currentQuestion,
                                  event.target.value as QuestionType
                                )
                              : currentQuestion
                          )
                        )
                      }
                    >
                      <option value="open">Abierta evaluada por IA</option>
                      <option value="single">Respuesta simple</option>
                      <option value="multiple">Respuesta multiple</option>
                    </select>
                  </label>

                  {question.type === 'open' ? (
                    <div className="grid gap-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-[var(--ink)]">
                          Respuesta modelo
                        </span>
                        <textarea
                          className="field-shell min-h-[120px]"
                          value={question.modelAnswer}
                          onChange={(event) =>
                            updateQuestion(index, { modelAnswer: event.target.value })
                          }
                          placeholder="Escribe la respuesta ideal o criterio base"
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-[var(--ink)]">
                            Conceptos clave
                          </span>
                          <input
                            className="field-shell"
                            value={question.keyConcepts}
                            onChange={(event) =>
                              updateQuestion(index, { keyConcepts: event.target.value })
                            }
                            placeholder="Ej. apertura, cierre, href"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-[var(--ink)]">
                            Expresiones esperadas
                          </span>
                          <input
                            className="field-shell"
                            value={question.expectedExpressions}
                            onChange={(event) =>
                              updateQuestion(index, {
                                expectedExpressions: event.target.value
                              })
                            }
                            placeholder="Ej. <a>, </a>, href"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-[var(--ink)]">
                            Opciones de respuesta
                          </span>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Cada opcion se edita por separado para que los textos largos se vean completos.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => addOption(index)}
                        >
                          Agregar opcion
                        </button>
                      </div>

                      <div className="space-y-3">
                        {question.options.map((option, optionIndex) => {
                          const inputType = question.type === 'single' ? 'radio' : 'checkbox';
                          const isChecked = question.correctAnswers.includes(option);

                          return (
                            <div
                              key={optionIndex}
                              className="grid gap-3 rounded-[1.5rem] border border-[rgba(82,55,30,0.1)] bg-[rgba(255,252,247,0.72)] p-4 md:grid-cols-[auto,1fr,auto]"
                            >
                              <div className="flex min-h-[44px] items-center gap-2 pt-2">
                                <input
                                  type={inputType}
                                  name={`correct-${index}`}
                                  checked={isChecked}
                                  onChange={(event) =>
                                    toggleCorrectAnswer(index, option, event.target.checked)
                                  }
                                  className="h-4 w-4"
                                />
                                {isChecked && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                    Correcta
                                  </span>
                                )}
                              </div>
                              <input
                                className="field-shell"
                                value={option}
                                onChange={(event) =>
                                  updateOption(index, optionIndex, event.target.value)
                                }
                                placeholder={`Opcion ${optionIndex + 1}`}
                              />
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => removeOption(index, optionIndex)}
                                disabled={question.options.length <= 2}
                              >
                                Eliminar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          {error && (
            <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <p className="text-sm text-[var(--muted)]">
                Las preguntas abiertas usan respuesta modelo, conceptos y expresiones como base.
              </p>
              {mode === 'edit' && (
                <button
                  type="button"
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar cuestionario'}
                </button>
              )}
            </div>
            <button type="submit" className="warm-button" disabled={loading}>
              {loading
                ? mode === 'edit'
                  ? 'Guardando cambios...'
                  : 'Creando cuestionario...'
                : mode === 'edit'
                  ? 'Guardar cambios'
                  : 'Crear cuestionario'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
