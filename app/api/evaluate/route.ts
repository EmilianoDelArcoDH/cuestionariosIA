import { NextResponse } from 'next/server';
import { findQuestionById } from '@/lib/questionnaires';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
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
  return Number.isNaN(parsed) ? null : parsed;
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
  if (!GEMINI_API_KEY) {
    const normalizedAnswer = normalizeText(answer);
    const foundConcepts = keyConcepts.filter((concept) =>
      normalizedAnswer.includes(normalizeText(concept))
    );
    const score = Math.round((foundConcepts.length / Math.max(keyConcepts.length, 1)) * 100);
    const missing = keyConcepts.filter((concept) => !foundConcepts.includes(concept));

    return `Evaluacion local. Puntaje: ${score}/100. Conceptos detectados: ${foundConcepts.join(', ') || 'ninguno'}. Conceptos faltantes: ${missing.join(', ') || 'ninguno'}. Respuesta esperada de referencia: ${modelAnswer}`;
  }

  try {
    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  `Eres un evaluador de respuestas abiertas para cuestionarios educativos. ` +
                  `Debes devolver un feedback breve en espanol y un puntaje del 0 al 100. ` +
                  `Pregunta ID: ${questionId}. ` +
                  `Pregunta: ${questionText}. ` +
                  `Respuesta modelo: ${modelAnswer}. ` +
                  `Conceptos clave: ${keyConcepts.join(', ') || 'sin conceptos definidos'}. ` +
                  `Expresiones esperadas: ${expectedExpressions.join(', ') || 'sin expresiones definidas'}. ` +
                  `Respuesta del alumno: ${answer}`
              }
            ]
          }
        ]
      })
    });

    const geminiData = await geminiRes.json();
    const rawFeedback =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin feedback de Gemini.';
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

    return normalizedFeedback;
  } catch {
    return 'Error al conectar con Gemini.';
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
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

  return NextResponse.json({ feedback });
}
