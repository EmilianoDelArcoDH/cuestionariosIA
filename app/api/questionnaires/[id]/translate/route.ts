import { NextResponse } from 'next/server';
import {
  createQuestionnaire,
  getQuestionnaireById
} from '@/lib/questionnaires';
import { translateQuestionnaire } from '@/lib/questionnaireTranslation';

export const dynamic = 'force-dynamic';

type SupportedTranslationLanguage = 'en' | 'pt';

function isSupportedLanguage(value: unknown): value is SupportedTranslationLanguage {
  return value === 'en' || value === 'pt';
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const body = await request.json().catch(() => null);
  const language = body?.language;

  if (!id) {
    return NextResponse.json({ error: 'Id invalido.' }, { status: 400 });
  }

  if (!isSupportedLanguage(language)) {
    return NextResponse.json(
      { error: 'Debes indicar un idioma valido: en o pt.' },
      { status: 400 }
    );
  }

  const questionnaire = await getQuestionnaireById(id);

  if (!questionnaire) {
    return NextResponse.json(
      { error: 'No se encontro el cuestionario.' },
      { status: 404 }
    );
  }

  try {
    const translated = await translateQuestionnaire(questionnaire, language);
    const created = await createQuestionnaire(translated);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo duplicar y traducir el cuestionario.'
      },
      { status: 400 }
    );
  }
}

