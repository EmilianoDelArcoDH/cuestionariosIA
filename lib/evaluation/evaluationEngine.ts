import { ruleBasedValidate } from './ruleBasedValidator';
import { evaluateWithAI } from './aiEvaluator';
import { combineResults } from './scoring';
import type {
  CombinedEvaluationResult,
  EvaluationEngineInput
} from './types';

export async function evaluateAnswer(
  input: EvaluationEngineInput
): Promise<CombinedEvaluationResult> {
  const { studentAnswer, context } = input;

  const ruleBased = ruleBasedValidate(studentAnswer, context);
  const ai = await evaluateWithAI(studentAnswer, context);
  const combined = combineResults(ruleBased, ai);

  return combined;
}

