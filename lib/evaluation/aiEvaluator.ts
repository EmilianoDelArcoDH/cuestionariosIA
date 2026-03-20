import type {
  AIModelEvaluation,
  EvaluationContext,
  EvaluationOutcome
} from './types';

export type AIProvider = 'mock';

export interface AIClientConfig {
  provider: AIProvider;
}

const DEFAULT_CONFIG: AIClientConfig = {
  provider: 'mock'
};

function simpleSemanticHeuristic(
  studentAnswer: string,
  context: EvaluationContext
): AIModelEvaluation {
  const answer = studentAnswer.toLowerCase();
  const matchedConcepts: string[] = [];
  const missingConcepts: string[] = [];

  for (const concept of context.keyConcepts) {
    if (answer.includes(concept.toLowerCase())) {
      matchedConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  }

  // Very naive similarity based on overlap with model answer
  const modelNorm = context.modelAnswer.toLowerCase();
  const overlapTokens = answer
    .split(/\s+/)
    .filter((t) => t && modelNorm.includes(t));
  const similarity =
    answer.length === 0 ? 0 : Math.min(1, overlapTokens.length / 10);

  let baseScore = Math.round(similarity * 100);

  baseScore += matchedConcepts.length * 5;
  baseScore -= missingConcepts.length * 5;

  baseScore = Math.max(0, Math.min(100, baseScore));

  let result: EvaluationOutcome = 'incorrect';
  if (baseScore >= 85) result = 'correct';
  else if (baseScore >= 60) result = 'partially_correct';

  const confidence = Math.min(
    0.95,
    0.4 + similarity * 0.4 + matchedConcepts.length * 0.03
  );

  const feedback =
    result === 'correct'
      ? 'La respuesta es conceptualmente correcta.'
      : result === 'partially_correct'
      ? 'La respuesta muestra comprensión parcial del concepto.'
      : 'La respuesta no demuestra una comprensión suficiente del concepto.';

  const teacherReviewRecommended =
    result === 'partially_correct' || confidence < 0.65;

  return {
    result,
    score: baseScore,
    confidence,
    matchedConcepts,
    missingConcepts,
    feedback,
    teacherReviewRecommended,
    rawModelResponse: {
      similarity,
      overlapTokensCount: overlapTokens.length
    }
  };
}

export async function evaluateWithAI(
  studentAnswer: string,
  context: EvaluationContext,
  config: AIClientConfig = DEFAULT_CONFIG
): Promise<AIModelEvaluation> {
  // En esta Fase 1 usamos un proveedor mock basado en heurísticas.
  // Más adelante se sustituirá por llamadas reales a OpenAI / Groq / Ollama.
  if (config.provider === 'mock') {
    return simpleSemanticHeuristic(studentAnswer, context);
  }

  return simpleSemanticHeuristic(studentAnswer, context);
}

