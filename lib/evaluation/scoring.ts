import type {
  AIModelEvaluation,
  CombinedEvaluationResult,
  EvaluationOutcome,
  RuleBasedResult
} from './types';

const CORRECT_THRESHOLD = 85;
const PARTIAL_THRESHOLD = 60;
const LOW_CONFIDENCE_THRESHOLD = 0.65;

export function combineResults(
  ruleBased: RuleBasedResult,
  ai: AIModelEvaluation
): CombinedEvaluationResult {
  // Ponderación sencilla: 30% reglas, 70% IA
  const finalScore = Math.round(
    ruleBased.heuristicScore * 0.3 + ai.score * 0.7
  );

  let result: EvaluationOutcome = 'incorrect';
  if (finalScore >= CORRECT_THRESHOLD) {
    result = 'correct';
  } else if (finalScore >= PARTIAL_THRESHOLD) {
    result = 'partially_correct';
  }

  const confidence = Math.min(
    0.99,
    (ai.confidence + (ruleBased.passedBasicChecks ? 0.1 : -0.1)) / 1.1
  );

  const teacherReviewRecommended =
    ai.teacherReviewRecommended ||
    confidence < LOW_CONFIDENCE_THRESHOLD ||
    (result === 'partially_correct' &&
      finalScore >= PARTIAL_THRESHOLD &&
      finalScore < CORRECT_THRESHOLD);

  const feedbackParts: string[] = [];
  feedbackParts.push(ai.feedback);

  if (ruleBased.structuralIssues.length > 0) {
    feedbackParts.push(
      `Se detectaron problemas estructurales: ${ruleBased.structuralIssues.join(
        '; '
      )}`
    );
  }

  if (ruleBased.requiredKeywordsMissing.length > 0) {
    feedbackParts.push(
      `Faltan conceptos clave: ${ruleBased.requiredKeywordsMissing.join(', ')}`
    );
  }

  const feedback = feedbackParts.join(' ');

  const matchedConcepts = Array.from(
    new Set(ai.matchedConcepts)
  ).sort((a, b) => a.localeCompare(b));
  const missingConcepts = Array.from(
    new Set(ai.missingConcepts)
  ).sort((a, b) => a.localeCompare(b));

  return {
    result,
    score: finalScore,
    confidence,
    matchedConcepts,
    missingConcepts,
    feedback,
    teacherReviewRecommended,
    ruleBased,
    aiEvaluation: ai
  };
}

