import { NextResponse } from 'next/server';
import {
  createQuestionnaire,
  getQuestionnaires,
  type CreateQuestionInput
} from '@/lib/questionnaires';

export const dynamic = 'force-dynamic';

function parseCsv(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET() {
  const questionnaires = await getQuestionnaires();
  return NextResponse.json(questionnaires);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description =
    typeof body?.description === 'string' ? body.description.trim() : '';
  const rawQuestions: unknown[] = Array.isArray(body?.questions) ? body.questions : [];

  if (!title) {
    return NextResponse.json(
      { error: 'El titulo del cuestionario es obligatorio.' },
      { status: 400 }
    );
  }

  if (rawQuestions.length === 0) {
    return NextResponse.json(
      { error: 'Debes agregar al menos una pregunta.' },
      { status: 400 }
    );
  }

  try {
    const questions: CreateQuestionInput[] = rawQuestions.map(
      (question: unknown, index: number) => {
      const record =
        question && typeof question === 'object'
          ? (question as Record<string, unknown>)
          : {};
      const text = typeof record.text === 'string' ? record.text.trim() : '';
      const type = record.type;

      if (!text) {
        throw new Error(`La pregunta ${index + 1} no tiene enunciado.`);
      }

      if (type !== 'open' && type !== 'single' && type !== 'multiple') {
        throw new Error(`La pregunta ${index + 1} tiene un tipo invalido.`);
      }

      if (type === 'open') {
        const modelAnswer =
          typeof record.modelAnswer === 'string' ? record.modelAnswer.trim() : '';

        if (!modelAnswer) {
          throw new Error(`La pregunta abierta ${index + 1} necesita una respuesta modelo.`);
        }

        return {
          text,
          type: 'open',
          modelAnswer,
          keyConcepts: parseCsv(record.keyConcepts),
          expectedExpressions: parseCsv(record.expectedExpressions)
        };
      }

      const options = parseCsv(record.options);
      const correctAnswers = parseCsv(record.correctAnswers);

      if (options.length < 2) {
        throw new Error(`La pregunta ${index + 1} necesita al menos dos opciones.`);
      }

      if (correctAnswers.length === 0) {
        throw new Error(`La pregunta ${index + 1} necesita al menos una respuesta correcta.`);
      }

      if (type === 'single' && correctAnswers.length !== 1) {
        throw new Error(`La pregunta simple ${index + 1} debe tener una sola respuesta correcta.`);
      }

      const invalidCorrect = correctAnswers.find((answer) => !options.includes(answer));
      if (invalidCorrect) {
        throw new Error(
          `La respuesta correcta "${invalidCorrect}" de la pregunta ${index + 1} no existe entre las opciones.`
        );
      }

      return {
        text,
        type,
        options,
        correctAnswers
      };
    });

    const created = await createQuestionnaire({
      title,
      description,
      questions
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo crear el cuestionario.'
      },
      { status: 400 }
    );
  }
}
