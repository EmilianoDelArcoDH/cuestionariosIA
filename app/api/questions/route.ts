import { NextResponse } from 'next/server';
import { getQuestionsByQuestionnaireId } from '@/lib/questionnaires';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id') || 1);
  const questions = await getQuestionsByQuestionnaireId(id);
  return NextResponse.json(questions);
}
