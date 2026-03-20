export type EvaluationOutcome = 'correct' | 'partially_correct' | 'incorrect';

export interface RuleBasedResult {
  passedBasicChecks: boolean;
  requiredKeywordsMissing: string[];
  regexMatched: boolean;
  structuralIssues: string[];
  heuristicScore: number; // 0-100
  details: string[];
}

export interface AIModelEvaluation {
  result: EvaluationOutcome;
  score: number; // 0-100
  confidence: number; // 0-1
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  teacherReviewRecommended: boolean;
  rawModelResponse?: unknown;
}

export interface CombinedEvaluationResult {
  result: EvaluationOutcome;
  score: number;
  confidence: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  teacherReviewRecommended: boolean;
  ruleBased: RuleBasedResult;
  aiEvaluation: AIModelEvaluation;
}

export interface EvaluationContext {
  prompt: string;
  modelAnswer: string;
  keyConcepts: string[];
  expectedExpressions: string[];
  commonMistakes: string[];
  correctExamples: string[];
  incorrectExamples: string[];
  maxScore: number;
  tolerance: number; // 0-1
  useRegex: boolean;
  regexPattern?: string;
}

export interface EvaluationEngineInput {
  studentAnswer: string;
  context: EvaluationContext;
}

