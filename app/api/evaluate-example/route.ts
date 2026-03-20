import { NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/evaluation/evaluationEngine';
import type { EvaluationContext } from '@/lib/evaluation/types';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const studentAnswer: string =
    typeof body?.answer === 'string' ? body.answer : '';

  const context: EvaluationContext = {
    prompt: '¿Cómo se compone una etiqueta ancla en HTML?',
    modelAnswer:
      'Una etiqueta ancla se compone de una etiqueta de apertura <a> y una etiqueta de cierre </a>, y puede incluir atributos como href.',
    keyConcepts: ['etiqueta de apertura', 'etiqueta de cierre', '<a>'],
    expectedExpressions: ['<a>', '</a>', 'href'],
    commonMistakes: [
      'usar solo href sin etiqueta',
      'confundir con <link>',
      'olvidar el cierre </a>'
    ],
    correctExamples: [
      '<a href="https://ejemplo.com">Ir</a>',
      'La etiqueta ancla usa <a>...</a> con atributos como href'
    ],
    incorrectExamples: [
      '<a href="https://ejemplo.com">',
      '<link href="https://ejemplo.com">'
    ],
    maxScore: 100,
    tolerance: 0.8,
    useRegex: false,
    regexPattern: undefined
  };

  const evaluation = await evaluateAnswer({
    studentAnswer,
    context
  });

  return NextResponse.json(evaluation);
}

