import { NextResponse } from 'next/server';
import { getQuestionnaireById } from '@/lib/questionnaires';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id') || 1);
  const questionnaire = await getQuestionnaireById(id);

  return NextResponse.json({
    title: questionnaire?.title ?? `Cuestionario ${id}`,
    questions: questionnaire?.questions ?? []
  });
}
