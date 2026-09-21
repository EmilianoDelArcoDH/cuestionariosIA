import { NextResponse } from 'next/server';
import { findQuestionById } from '@/lib/questionnaires';
import { requestEvaluationFeedback } from '@/lib/geminiEvaluation';
import { buildEvaluationPrompt } from '@/lib/evaluationPrompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function extractScore(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*\/\s*100|puntaje\s*:?\s*(\d{1,3})/i);
  const rawScore = match?.[1] ?? match?.[2];

  if (!rawScore) {
    return null;
  }

  const parsed = Number(rawScore);
  return Number.isNaN(parsed) || parsed < 0 || parsed > 100 ? null : parsed;
}

function evaluateChoiceQuestion(answer: unknown, correctAnswers: string[], type: 'single' | 'multiple') {
  if (type === 'single') {
    if (typeof answer !== 'string' || !answer.trim()) {
      return 'No seleccionaste ninguna opcion.';
    }

    const isCorrect = correctAnswers.includes(answer);
    return isCorrect
      ? `Correcta. La opcion esperada era "${correctAnswers[0]}". Puntaje: 100/100.`
      : `Incorrecta. Seleccionaste "${answer}" y la opcion correcta era "${correctAnswers[0]}". Puntaje: 0/100.`;
  }

  if (!Array.isArray(answer) || answer.length === 0) {
    return 'No seleccionaste opciones.';
  }

  const selected = answer.map((item) => String(item));
  const normalizedSelected = selected.map(normalizeText).sort();
  const normalizedCorrect = [...correctAnswers].map(normalizeText).sort();
  const isCorrect =
    normalizedSelected.length === normalizedCorrect.length &&
    normalizedSelected.every((item, index) => item === normalizedCorrect[index]);

  if (isCorrect) {
    return `Correcta. Seleccionaste todas las respuestas esperadas (${correctAnswers.join(', ')}). Puntaje: 100/100.`;
  }

  const missing = correctAnswers.filter(
    (item) => !normalizedSelected.includes(normalizeText(item))
  );
  const extra = selected.filter(
    (item) => !normalizedCorrect.includes(normalizeText(item))
  );

  return `Parcial. Correctas: ${correctAnswers.join(', ')}. Faltantes: ${missing.join(', ') || 'ninguno'}. Extras: ${extra.join(', ') || 'ninguno'}. Puntaje: 50/100.`;
}

async function evaluateOpenQuestion(answer: string, questionText: string, questionId: number, modelAnswer: string, keyConcepts: string[], expectedExpressions: string[]) {
  if (!GEMINI_API_KEY && !process.env.GROQ_API_KEY?.trim()) {
    const normalizedAnswer = normalizeText(answer);
    const foundConcepts = keyConcepts.filter((concept) =>
      normalizedAnswer.includes(normalizeText(concept))
    );
    const score = Math.round((foundConcepts.length / Math.max(keyConcepts.length, 1)) * 100);
    const missing = keyConcepts.filter((concept) => !foundConcepts.includes(concept));

    return `Evaluacion local. Puntaje: ${score}/100. Conceptos detectados: ${foundConcepts.join(', ') || 'ninguno'}. Conceptos faltantes: ${missing.join(', ') || 'ninguno'}. Respuesta esperada de referencia: ${modelAnswer}`;
  }

  try {
    const rawFeedback = await requestEvaluationFeedback(buildEvaluationPrompt({
      questionId,
      question: questionText,
      referenceAnswer: modelAnswer,
      keyConcepts,
      expectedExpressions,
      studentAnswer: answer
    }));
    const score = extractScore(rawFeedback);

    const cleanFeedback = rawFeedback
      .replace(/\*\*Feedback:?\*\*/gi, '')
      .replace(/Feedback:?/gi, '')
      .replace(/Puntaje:?\s*\d{1,3}\s*\/\s*100/gi, '')
      .replace(/Puntaje:?\s*\d{1,3}/gi, '')
      .replace(/\*\*Puntaje:?\*\*/gi, '');

    const normalizedFeedback = cleanFeedback
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (score !== null) {
      return `Puntaje: ${score}/100. ${normalizedFeedback}`;
    }

    throw new Error('La IA devolvio una evaluacion sin puntaje valido.');
  } catch (error) {
    return `Evaluacion pendiente. ${error instanceof Error ? error.message : 'No se pudo conectar con la IA.'} Intenta enviar nuevamente.`;
  }
}

function isQuestionAnswered(question: any, answer: unknown) {
  if (question.type === 'open') {
    return typeof answer === 'string' && Boolean(answer.trim());
  }

  if (question.type === 'single') {
    return typeof answer === 'string' && Boolean(answer.trim());
  }

  if (question.type === 'multiple') {
    return Array.isArray(answer) && answer.length > 0;
  }

  return false;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const answers = Array.isArray(body?.answers) ? body.answers : null;

  if (answers) {
    const questions = await Promise.all(
      answers.map(async (entry: { questionId?: unknown; answer?: unknown }) => {
        const questionId = Number(entry?.questionId);

        if (!questionId) {
          return null;
        }

        const question = await findQuestionById(questionId);

        if (!question) {
          return null;
        }

        return {
          question,
          answer: entry?.answer
        };
      })
    );

    if (questions.some((entry) => !entry)) {
      return NextResponse.json(
        { error: 'No se pudieron cargar todas las preguntas para evaluar.' },
        { status: 400 }
      );
    }

    const missingQuestions = questions.filter(
      (entry) => entry && !isQuestionAnswered(entry.question, entry.answer)
    );

    if (missingQuestions.length > 0) {
      return NextResponse.json(
        {
          error: 'Completa todas las preguntas antes de enviar el cuestionario.',
          missingQuestionIds: missingQuestions.map((entry) => entry?.question.id)
        },
        { status: 400 }
      );
    }

    const feedback: Array<string | null> = [];
    for (const entry of questions) {
      feedback.push(await (async () => {
        if (!entry) {
          return null;
        }

        const { question, answer } = entry;

        if (question.type === 'open') {
          return await evaluateOpenQuestion(
            typeof answer === 'string' ? answer : '',
            question.text,
            question.id,
            question.openConfig?.modelAnswer ?? '',
            question.openConfig?.keyConcepts ?? [],
            question.openConfig?.expectedExpressions ?? []
          );
        }

        if (question.type === 'single' || question.type === 'multiple') {
          return evaluateChoiceQuestion(
            answer,
            question.choiceConfig?.correctAnswers ?? [],
            question.type
          );
        }

        return 'Tipo de pregunta desconocido.';
      })());
      if (feedback[feedback.length - 1]?.startsWith('Evaluacion pendiente.')) break;
    }

    if (feedback.some((item) => item?.startsWith('Evaluacion pendiente.'))) {
      const error = feedback.find((item) => item?.startsWith('Evaluacion pendiente.'));
      return NextResponse.json({ error, feedback, score: null, approved: false }, { status: 503 });
    }

    const scores = feedback
      .map((item) => (item ? extractScore(item) : null))
      .filter((score): score is number => score !== null);
    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;

    return NextResponse.json({
      feedback,
      score: averageScore,
      approved: averageScore !== null && averageScore >= 70,
      summary:
        averageScore !== null
          ? `Cuestionario evaluado. Puntaje general: ${averageScore}/100.`
          : 'Cuestionario evaluado.'
    });
  }

  const answer = body?.answer;
  const questionId = Number(body?.questionId);

  if (!questionId) {
    return NextResponse.json({ feedback: 'Pregunta invalida.' }, { status: 400 });
  }

  const question = await findQuestionById(questionId);

  if (!question) {
    return NextResponse.json({ feedback: 'No se encontro la pregunta.' }, { status: 404 });
  }

  let feedback = '';

  if (question.type === 'open') {
    feedback = await evaluateOpenQuestion(
      typeof answer === 'string' ? answer : '',
      question.text,
      question.id,
      question.openConfig?.modelAnswer ?? '',
      question.openConfig?.keyConcepts ?? [],
      question.openConfig?.expectedExpressions ?? []
    );
  } else if (question.type === 'single' || question.type === 'multiple') {
    feedback = evaluateChoiceQuestion(
      answer,
      question.choiceConfig?.correctAnswers ?? [],
      question.type
    );
  } else {
    feedback = 'Tipo de pregunta desconocido.';
  }

  if (feedback.startsWith('Evaluacion pendiente.')) {
    return NextResponse.json({ error: feedback, feedback }, { status: 503 });
  }

  return NextResponse.json({ feedback });
}
