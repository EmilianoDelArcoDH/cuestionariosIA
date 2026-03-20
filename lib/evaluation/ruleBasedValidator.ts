import type { EvaluationContext, RuleBasedResult } from './types';

const MIN_LENGTH = 5;

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

export function ruleBasedValidate(
  studentAnswer: string,
  context: EvaluationContext
): RuleBasedResult {
  const normalized = normalize(studentAnswer);
  const details: string[] = [];
  const structuralIssues: string[] = [];
  const requiredKeywordsMissing: string[] = [];

  if (normalized.length < MIN_LENGTH) {
    structuralIssues.push('La respuesta es demasiado corta.');
  }

  // Simple HTML tag detection if relevant
  if (context.expectedExpressions.some((exp) => exp.includes('<a'))) {
    const hasAnchorTag = /<\s*a\b[^>]*>.*?<\s*\/\s*a\s*>/i.test(studentAnswer);
    if (!hasAnchorTag) {
      structuralIssues.push(
        'No se detectó una etiqueta de ancla completa `<a>...</a>` en la respuesta.'
      );
    } else {
      details.push('Se detectó una etiqueta de ancla HTML.');
    }
  }

  // Check required keywords based on key concepts
  for (const concept of context.keyConcepts) {
    const conceptNorm = normalize(concept);
    if (!normalized.includes(conceptNorm)) {
      requiredKeywordsMissing.push(concept);
    }
  }

  // Optional regex validation
  let regexMatched = false;
  if (context.useRegex && context.regexPattern) {
    try {
      const re = new RegExp(context.regexPattern, 'i');
      regexMatched = re.test(studentAnswer);
      if (!regexMatched) {
        details.push('La respuesta no coincide con el patrón esperado.');
      } else {
        details.push('La respuesta coincide con el patrón esperado.');
      }
    } catch {
      details.push('Error al compilar la expresión regular de validación.');
    }
  }

  // Heuristic scoring: start from 50 and adjust
  let heuristicScore = 50;

  if (structuralIssues.length > 0) {
    heuristicScore -= 20;
  }

  if (requiredKeywordsMissing.length > 0) {
    heuristicScore -= 10 * requiredKeywordsMissing.length;
  } else if (context.keyConcepts.length > 0) {
    heuristicScore += 15;
  }

  if (regexMatched) {
    heuristicScore += 10;
  }

  heuristicScore = Math.max(0, Math.min(100, heuristicScore));

  const passedBasicChecks =
    structuralIssues.length === 0 && heuristicScore >= 40;

  return {
    passedBasicChecks,
    requiredKeywordsMissing,
    regexMatched,
    structuralIssues,
    heuristicScore,
    details
  };
}

