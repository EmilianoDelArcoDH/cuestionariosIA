import { NextResponse } from 'next/server';
import {
  getQuestionnaireById,
  getQuestionnaireByIdq
} from '@/lib/questionnaires';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const idq = url.searchParams.get('idq');
    const idParam = url.searchParams.get('id');

    let questionnaire = null;

    if (idq) {
      questionnaire = await getQuestionnaireByIdq(idq);
    } else {
      const id = Number(idParam || 1);
      questionnaire = await getQuestionnaireById(id);
    }

    return NextResponse.json({
      title: questionnaire?.title ?? 'Cuestionario',
      id: questionnaire?.id,
      questions: questionnaire?.questions ?? []
    });
  } catch (error) {
    console.error('Error en /api/questions:', error);

    return NextResponse.json(
      {
        error: 'Error interno al cargar el cuestionario.',
        questions: []
      },
      { status: 500 }
    );
  }
}