import { env, pipeline } from '@huggingface/transformers';
import type { ZeroShotClassificationPipeline } from '@huggingface/transformers';

type ZeroShotClassifier = ZeroShotClassificationPipeline;

interface EvaluationPayload {
  question: string;
  referenceAnswer?: string;
  keyConcepts?: string[];
  expectedExpressions?: string[];
  studentAnswer: string;
}

interface ZeroShotResult {
  labels?: string[];
  scores?: number[];
}

interface CriterionResult {
  name: string;
  passed: boolean;
  evidence?: string;
}

// Multilingual NLI/zero-shot model with ONNX + Transformers.js support.
// It covers Spanish and English, is smaller than generative instruction models,
// and contributes a semantic adequacy signal. The final grade is assigned from
// evaluation criteria, not by converting model confidence into a score.
const DEFAULT_MODEL = 'onnx-community/multilingual-MiniLMv2-L6-mnli-xnli-ONNX';
const ADEQUATE_LABEL = 'adequate relevant coherent answer';
const INSUFFICIENT_LABEL = 'insufficient irrelevant incoherent answer';
const MIN_ANSWER_LENGTH = 4;
const MAX_RANDOM_RATIO = 0.45;
const HIGH_CONFIDENCE = 0.18;
const LOW_CONFIDENCE = -0.08;
const DEVICES = [
  'auto',
  'cpu',
  'webgpu',
  'dml'
] as const;

type TransformerDevice = typeof DEVICES[number];

let classifierPromise: Promise<ZeroShotClassifier> | null = null;

env.allowLocalModels = false;

const VAGUE_PATTERNS = [
  /\bno\s+se\b/i,
  /\bno\s+se\b/i,
  /\bno\s+tengo\s+idea\b/i,
  /\bno\s+entiendo\b/i,
  /\bi\s+don'?t\s+know\b/i,
  /\bnot\s+sure\b/i,
  /\bthings?\b/i,
  /\bstuff\b/i,
  /\bcosas?\b/i,
  /\balgo\b/i,
  /\bvarias?\s+cosas?\b/i,
  /\bme\s+gusta\b/i,
  /\bi\s+like\b/i
];

const TUTORIAL_META_PATTERNS = [
  /\btutorial(?:es)?\s+(?:son|es|seran)?\s*(?:[a-z0-9]+\s+){0,3}(?:utiles?|interesantes?|buenos?|importantes?)/i,
  /\btutorials?\s+(?:are|is)?\s*(?:\w+\s+){0,3}(?:useful|interesting|good|important)/i,
  /\btendra\s+(?:imagenes|ejemplos|explicaciones|texto|videos?|secciones)/i,
  /\bwill\s+have\s+(?:images|examples|explanations|text|videos?|sections)/i
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
  'programar',
  'escribir',
  'aplicar',
  'instalar',
  'configurar',
  'create',
  'make',
  'use',
  'explain',
  'identify',
  'solve',
  'design',
  'develop',
  'build',
  'program',
  'write',
  'apply',
  'install',
  'configure'
];

const GENERIC_TOKENS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'a',
  'al',
  'en',
  'con',
  'por',
  'para',
  'que',
  'que',
  'como',
  'como',
  'sobre',
  'va',
  'ser',
  'sera',
  'sera',
  'y',
  'o',
  'es',
  'son',
  'lo',
  'se',
  'su',
  'sus',
  'the',
  'a',
  'an',
  'to',
  'of',
  'in',
  'on',
  'with',
  'and',
  'or',
  'will',
  'be',
  'is',
  'are',
  'what',
  'about',
  'how',
  'tutorial',
  'tutoriales',
  'tutorials',
  'alguien',
  'someone',
  'read',
  'lea'
]);

function getClassifier() {
  const configuredDevice = process.env.TRANSFORMERS_DEVICE?.trim();
  const device: TransformerDevice = DEVICES.includes(
    configuredDevice as TransformerDevice
  )
    ? configuredDevice as TransformerDevice
    : 'cpu';

  classifierPromise ??= pipeline(
    'zero-shot-classification',
    process.env.TRANSFORMERS_EVALUATION_MODEL?.trim() || DEFAULT_MODEL,
    {
      device,
      dtype: 'q8'
    }
  ) as Promise<ZeroShotClassifier>;

  return classifierPromise;
}

function parsePromptPayload(prompt: string): EvaluationPayload {
  const jsonStart = prompt.lastIndexOf('{');
  if (jsonStart === -1) {
    throw new Error('No se pudo leer el contexto de evaluacion.');
  }

  const parsed = JSON.parse(prompt.slice(jsonStart)) as Partial<EvaluationPayload>;
  if (
    typeof parsed.question !== 'string' ||
    typeof parsed.studentAnswer !== 'string'
  ) {
    throw new Error('El contexto de evaluacion es invalido.');
  }

  return {
    question: parsed.question,
    referenceAnswer:
      typeof parsed.referenceAnswer === 'string' ? parsed.referenceAnswer : '',
    keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
    expectedExpressions: Array.isArray(parsed.expectedExpressions)
      ? parsed.expectedExpressions
      : [],
    studentAnswer: parsed.studentAnswer
  };
}

function hasEnoughText(answer: string) {
  const normalized = answer.trim();
  if (normalized.length < MIN_ANSWER_LENGTH) return false;
  if (!/[\p{L}\p{N}]/u.test(normalized)) return false;

  const alphanumeric = normalized.match(/[\p{L}\p{N}]/gu) ?? [];
  const unique = new Set(alphanumeric.map((char) => char.toLowerCase()));
  const randomRatio = unique.size / Math.max(alphanumeric.length, 1);

  return !(alphanumeric.length >= 6 && randomRatio > MAX_RANDOM_RATIO && !/\s/.test(normalized));
}

function normalizeLanguageText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function words(text: string) {
  return normalizeLanguageText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function substantiveWords(text: string) {
  return words(text).filter((word) => !GENERIC_TOKENS.has(word));
}

function hasPattern(text: string, patterns: RegExp[]) {
  const normalized = normalizeLanguageText(text);
  return patterns.some((pattern) => pattern.test(normalized));
}

function hasActionTerm(text: string) {
  const normalized = normalizeLanguageText(text);
  return ACTION_TERMS.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(normalized));
}

function asksForLearningOutcome(question: string) {
  const normalized = normalizeLanguageText(question);
  return (
    /\bque\s+va\s+a\s+aprender\b/i.test(normalized) ||
    /\bque\s+aprendera\b/i.test(normalized) ||
    /\bwhat\s+will\s+.*\blearn\b/i.test(normalized) ||
    /\bwhat\s+.*\blearn\b/i.test(normalized)
  );
}

function asksForTopic(question: string) {
  const normalized = normalizeLanguageText(question);
  return (
    /\bsobre\s+que\b/i.test(normalized) ||
    /\bde\s+que\b/i.test(normalized) ||
    /\btema\b/i.test(normalized) ||
    /\btematica\b/i.test(normalized) ||
    /\bwhat\s+.*\babout\b/i.test(normalized) ||
    /\btopic\b/i.test(normalized)
  );
}

function scoreResult(result: ZeroShotResult) {
  const labels = result.labels ?? [];
  const scores = result.scores ?? [];
  const adequateIndex = labels.indexOf(ADEQUATE_LABEL);
  const insufficientIndex = labels.indexOf(INSUFFICIENT_LABEL);
  const adequateScore = adequateIndex >= 0 ? scores[adequateIndex] ?? 0 : 0;
  const insufficientScore = insufficientIndex >= 0 ? scores[insufficientIndex] ?? 0 : 0;

  if (!Number.isFinite(adequateScore) || !Number.isFinite(insufficientScore)) {
    throw new Error('Transformers.js devolvio una evaluacion invalida.');
  }

  return { adequateScore, insufficientScore };
}

function toFeedback(score: number, reason: string) {
  return `Puntaje: ${score}/100 ${reason}`;
}

function buildSequence(payload: EvaluationPayload) {
  return [
    `Question: ${payload.question}`,
    `Student answer: ${payload.studentAnswer}`,
    'Evaluate whether the student answer directly and coherently answers the question.',
    'Accept Spanish, English, and reasonable mixed-language answers.',
    'Do not require a reference answer or exact keywords unless the question explicitly requires them.',
    payload.referenceAnswer
      ? `Optional reference answer, not a strict required answer: ${payload.referenceAnswer}`
      : '',
    payload.keyConcepts?.length
      ? `Optional concepts, not mandatory unless the question requires them: ${payload.keyConcepts.join(', ')}`
      : '',
    payload.expectedExpressions?.length
      ? `Optional expected expressions: ${payload.expectedExpressions.join(', ')}`
      : ''
  ].filter(Boolean).join('\n');
}

function evaluateCriteria(
  payload: EvaluationPayload,
  adequateScore: number,
  insufficientScore: number
) {
  const answer = payload.studentAnswer.trim();
  const answerWords = words(answer);
  const substance = substantiveWords(answer);
  const semanticGap = adequateScore - insufficientScore;
  const vague = hasPattern(answer, VAGUE_PATTERNS);
  const metaOnly = hasPattern(answer, TUTORIAL_META_PATTERNS);
  const enoughSubstance = substance.length >= 3 || /[A-Z]{2,}|[A-Z]?[a-z]+[A-Z][a-z]+/.test(answer);
  const hasConcreteDetail = substance.length >= 4 || /[<>/]|[A-Z]{2,}|[0-9]/.test(answer);
  const coherent = answerWords.length > 0 && hasEnoughText(answer);
  const topicQuestion = asksForTopic(payload.question);
  const learningQuestion = asksForLearningOutcome(payload.question);
  const givesLearningOutcome =
    hasPattern(answer, LEARNING_OUTCOME_PATTERNS) ||
    (learningQuestion && hasActionTerm(answer) && !metaOnly);
  const directForQuestion =
    learningQuestion
      ? givesLearningOutcome
      : topicQuestion
        ? enoughSubstance && !metaOnly && !vague
        : enoughSubstance && !vague;
  const relevant = semanticGap >= LOW_CONFIDENCE || directForQuestion;
  const sufficient = directForQuestion && hasConcreteDetail && coherent;

  const criteria: CriterionResult[] = [
    {
      name: 'relevancia',
      passed: relevant,
      evidence: relevant ? 'La respuesta se relaciona con la consigna.' : undefined
    },
    {
      name: 'respuesta directa',
      passed: directForQuestion,
      evidence: directForQuestion ? 'Contesta lo que pide la pregunta.' : undefined
    },
    {
      name: 'especificidad',
      passed: hasConcreteDetail && !vague,
      evidence: hasConcreteDetail && !vague ? 'Aporta informacion concreta.' : undefined
    },
    {
      name: 'coherencia',
      passed: coherent && !vague,
      evidence: coherent && !vague ? 'Es comprensible y coherente.' : undefined
    },
    {
      name: 'suficiencia',
      passed: sufficient,
      evidence: sufficient ? 'Incluye informacion suficiente para responder.' : undefined
    }
  ];

  return { criteria, metaOnly, vague, semanticGap };
}

function criteriaToScore(criteria: CriterionResult[], semanticGap: number) {
  const passed = criteria.filter((criterion) => criterion.passed).length;
  const direct = criteria.find((criterion) => criterion.name === 'respuesta directa')?.passed;
  const sufficient = criteria.find((criterion) => criterion.name === 'suficiencia')?.passed;
  const specificity = criteria.find((criterion) => criterion.name === 'especificidad')?.passed;

  if (direct && sufficient && specificity && passed >= 4) {
    return semanticGap >= HIGH_CONFIDENCE ? 95 : 90;
  }

  if (direct && passed >= 4) return 80;
  if (direct && passed >= 3) return 70;
  if (passed >= 3) return 55;
  if (passed >= 2) return 35;
  return 0;
}

function buildFeedback(score: number, criteria: CriterionResult[], metaOnly: boolean, vague: boolean) {
  if (score >= 85) {
    return 'La respuesta responde directamente a la consigna, es coherente y aporta informacion concreta suficiente.';
  }

  if (score >= 70) {
    return 'La respuesta responde la consigna de manera suficiente. Puede mejorar agregando mas precision o detalle.';
  }

  if (metaOnly) {
    return 'La respuesta se relaciona con el tema general, pero no contesta especificamente lo que pregunta la consigna.';
  }

  if (vague) {
    return 'La respuesta es demasiado general o insuficiente para considerar respondida la pregunta.';
  }

  const missing = criteria
    .filter((criterion) => !criterion.passed)
    .map((criterion) => criterion.name);

  return `La respuesta no cumple suficientemente estos criterios: ${missing.join(', ')}.`;
}

/** Fallback evaluator: multilingual NLI/zero-shot, not answer-key similarity. */
export async function evaluateWithTransformer(prompt: string): Promise<string> {
  const payload = parsePromptPayload(prompt);
  const answer = payload.studentAnswer.trim();

  if (!hasEnoughText(answer)) {
    return toFeedback(
      0,
      'La respuesta es demasiado breve, vacia o no parece ser una respuesta comprensible.'
    );
  }

  const classifier = await getClassifier();
  const output = await classifier(buildSequence(payload), [
    ADEQUATE_LABEL,
    INSUFFICIENT_LABEL
  ], {
    hypothesis_template: 'This student response is an {}.'
  });

  const result = Array.isArray(output) ? output[0] : output;
  const { adequateScore, insufficientScore } = scoreResult(result as ZeroShotResult);
  const { criteria, metaOnly, vague, semanticGap } = evaluateCriteria(
    payload,
    adequateScore,
    insufficientScore
  );
  const score = criteriaToScore(criteria, semanticGap);

  return toFeedback(score, buildFeedback(score, criteria, metaOnly, vague));
}
