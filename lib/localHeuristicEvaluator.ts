interface EvaluationPayload {
  question: string;
  referenceAnswer?: string;
  keyConcepts?: string[];
  expectedExpressions?: string[];
  studentAnswer: string;
}

const MIN_ANSWER_LENGTH = 4;

const GENERIC_TOKENS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'de',
  'del',
  'a',
  'en',
  'con',
  'por',
  'para',
  'que',
  'como',
  'sobre',
  'y',
  'o',
  'es',
  'son',
  'the',
  'an',
  'to',
  'of',
  'in',
  'on',
  'with',
  'and',
  'or',
  'what',
  'about',
  'how'
]);

const VAGUE_PATTERNS = [
  /\bno\s+se\b/i,
  /\bno\s+tengo\s+idea\b/i,
  /\bno\s+entiendo\b/i,
  /\bi\s+don'?t\s+know\b/i,
  /\bnot\s+sure\b/i,
  /\bcosas?\b/i,
  /\balgo\b/i
];

const LEARNING_OUTCOME_PATTERNS = [
  /\baprendera?\b/i,
  /\bensen(?:ar|are|o|aremos|ara)\b/i,
  /\bpodra\s+(?:crear|hacer|usar|utilizar|explicar|identificar|resolver|disenar|desarrollar|construir)\b/i,
  /\blearn\b/i,
  /\bteach\b/i,
  /\bwill\s+be\s+able\s+to\b/i,
  /\bhow\s+to\b/i
];

const ACTION_TERMS = [
  'crear',
  'hacer',
  'usar',
  'utilizar',
  'explicar',
  'identificar',
  'resolver',
  'disenar',
  'desarrollar',
  'construir',
  'create',
  'make',
  'use',
  'explain',
  'identify',
  'solve',
  'design',
  'develop',
  'build',
  'prepare'
];

function parsePromptPayload(prompt: string): EvaluationPayload {
  const jsonStart = prompt.lastIndexOf('{');
  if (jsonStart === -1) {
    throw new Error('No se pudo leer el contexto de evaluacion.');
  }

  const parsed = JSON.parse(prompt.slice(jsonStart)) as Partial<EvaluationPayload>;
  if (typeof parsed.question !== 'string' || typeof parsed.studentAnswer !== 'string') {
    throw new Error('El contexto de evaluacion es invalido.');
  }

  return {
    question: parsed.question,
    referenceAnswer: typeof parsed.referenceAnswer === 'string' ? parsed.referenceAnswer : '',
    keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
    expectedExpressions: Array.isArray(parsed.expectedExpressions) ? parsed.expectedExpressions : [],
    studentAnswer: parsed.studentAnswer
  };
}

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function words(text: string) {
  return normalizeText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function substantiveWords(text: string) {
  return words(text).filter((word) => !GENERIC_TOKENS.has(word));
}

function hasEnoughText(answer: string) {
  const normalized = answer.trim();
  if (normalized.length < MIN_ANSWER_LENGTH) return false;
  return /[\p{L}\p{N}]/u.test(normalized);
}

function hasPattern(text: string, patterns: RegExp[]) {
  const normalized = normalizeText(text);
  return patterns.some((pattern) => pattern.test(normalized));
}

function hasActionTerm(text: string) {
  const normalized = normalizeText(text);
  return ACTION_TERMS.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(normalized));
}

function asksForLearningOutcome(question: string) {
  const normalized = normalizeText(question);
  return (
    /\bque\s+va\s+a\s+aprender\b/i.test(normalized) ||
    /\bque\s+aprendera\b/i.test(normalized) ||
    /\bwhat\s+will\s+.*\blearn\b/i.test(normalized) ||
    /\bwhat\s+.*\blearn\b/i.test(normalized)
  );
}

function asksForTopic(question: string) {
  const normalized = normalizeText(question);
  return (
    /\bsobre\s+que\b/i.test(normalized) ||
    /\bde\s+que\b/i.test(normalized) ||
    /\btema\b/i.test(normalized) ||
    /\bwhat\s+.*\babout\b/i.test(normalized) ||
    /\btopic\b/i.test(normalized)
  );
}

function scorePayload(payload: EvaluationPayload) {
  const answer = payload.studentAnswer.trim();
  const normalizedAnswer = normalizeText(answer);
  const substance = substantiveWords(answer);
  const vague = hasPattern(answer, VAGUE_PATTERNS);
  const coherent = hasEnoughText(answer);
  const topicQuestion = asksForTopic(payload.question);
  const learningQuestion = asksForLearningOutcome(payload.question);
  const conceptMatches = (payload.keyConcepts ?? []).filter((concept) =>
    normalizedAnswer.includes(normalizeText(concept))
  );
  const expressionMatches = (payload.expectedExpressions ?? []).filter((expression) =>
    normalizedAnswer.includes(normalizeText(expression))
  );
  const enoughSubstance = substance.length >= 3 || conceptMatches.length > 0 || expressionMatches.length > 0;
  const hasConcreteDetail =
    substance.length >= 4 ||
    conceptMatches.length > 0 ||
    expressionMatches.length > 0 ||
    /[<>/]|[A-Z]{2,}|[0-9]/.test(answer);
  const givesLearningOutcome =
    hasPattern(answer, LEARNING_OUTCOME_PATTERNS) ||
    (learningQuestion && hasActionTerm(answer));
  const directForQuestion = learningQuestion
    ? givesLearningOutcome && enoughSubstance
    : topicQuestion
      ? enoughSubstance && !vague
      : enoughSubstance && !vague;

  let score = 0;
  if (coherent) score += 20;
  if (directForQuestion) score += 30;
  if (hasConcreteDetail) score += 25;
  if (conceptMatches.length > 0) score += 15;
  if (expressionMatches.length > 0) score += 10;
  if (vague) score -= 30;

  return Math.max(0, Math.min(100, score));
}

function feedbackForScore(score: number) {
  if (score >= 85) {
    return 'La respuesta responde directamente a la consigna, es coherente y aporta informacion concreta suficiente.';
  }

  if (score >= 70) {
    return 'La respuesta responde la consigna de manera suficiente. Puede mejorar agregando mas precision o detalle.';
  }

  if (score >= 40) {
    return 'La respuesta se relaciona parcialmente con la consigna, pero necesita mas precision o detalle.';
  }

  return 'La respuesta es demasiado general o insuficiente para considerar respondida la pregunta.';
}

export async function evaluateWithLocalHeuristic(prompt: string): Promise<string> {
  const payload = parsePromptPayload(prompt);
  const score = scorePayload(payload);
  return `Puntaje: ${score}/100 ${feedbackForScore(score)}`;
}
