import { type CreateQuestionInput } from '@/lib/questionnaires';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

type SupportedTranslationLanguage = 'en' | 'pt';

type QuestionnaireDetail = {
  title: string;
  description: string;
  questions: Array<{
    text: string;
    type: 'open' | 'single' | 'multiple';
    options?: string[];
    openConfig?: {
      modelAnswer: string;
      keyConcepts: string[];
      expectedExpressions: string[];
    };
    choiceConfig?: {
      correctAnswers: string[];
    };
  }>;
};

type TranslatedQuestionnaire = {
  title: string;
  description: string;
  questions: CreateQuestionInput[];
};

const languageLabel: Record<SupportedTranslationLanguage, string> = {
  en: 'English',
  pt: 'Portuguese'
};

function extractJsonPayload(rawText: string) {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La IA no devolvio JSON valido para la traduccion.');
  }

  return rawText.slice(start, end + 1);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function parseTranslatedQuestionnaire(rawText: string): TranslatedQuestionnaire {
  const jsonPayload = extractJsonPayload(rawText);
  const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const description =
    typeof parsed.description === 'string' ? parsed.description.trim() : '';
  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

  if (!title) {
    throw new Error('La traduccion no devolvio un titulo valido.');
  }

  if (rawQuestions.length === 0) {
    throw new Error('La traduccion no devolvio preguntas.');
  }

  const questions = rawQuestions.map((question, index) => {
    const record =
      question && typeof question === 'object'
        ? (question as Record<string, unknown>)
        : {};
    const text = typeof record.text === 'string' ? record.text.trim() : '';
    const type = record.type;

    if (!text) {
      throw new Error(`La pregunta traducida ${index + 1} no tiene texto.`);
    }

    if (type !== 'open' && type !== 'single' && type !== 'multiple') {
      throw new Error(`La pregunta traducida ${index + 1} tiene un tipo invalido.`);
    }

    if (type === 'open') {
      const modelAnswer =
        typeof record.modelAnswer === 'string' ? record.modelAnswer.trim() : '';

      if (!modelAnswer) {
        throw new Error(
          `La pregunta abierta traducida ${index + 1} no tiene respuesta modelo.`
        );
      }

      return {
        text,
        type,
        modelAnswer,
        keyConcepts: asStringArray(record.keyConcepts),
        expectedExpressions: asStringArray(record.expectedExpressions)
      } satisfies CreateQuestionInput;
    }

    const options = asStringArray(record.options);
    const correctAnswers = asStringArray(record.correctAnswers);

    if (options.length < 2) {
      throw new Error(`La pregunta traducida ${index + 1} necesita dos opciones o mas.`);
    }

    if (correctAnswers.length === 0) {
      throw new Error(
        `La pregunta traducida ${index + 1} no devolvio respuestas correctas.`
      );
    }

    const invalidAnswer = correctAnswers.find((answer) => !options.includes(answer));

    if (invalidAnswer) {
      throw new Error(
        `La opcion correcta "${invalidAnswer}" no coincide con las opciones traducidas.`
      );
    }

    if (type === 'single' && correctAnswers.length !== 1) {
      throw new Error(
        `La pregunta simple traducida ${index + 1} debe tener una sola opcion correcta.`
      );
    }

    return {
      text,
      type,
      options,
      correctAnswers
    } satisfies CreateQuestionInput;
  });

  return {
    title,
    description,
    questions
  };
}

function buildPrompt(questionnaire: QuestionnaireDetail, language: SupportedTranslationLanguage) {
  const targetLanguage = languageLabel[language];
  const serializableQuestions = questionnaire.questions.map((question) => ({
    text: question.text,
    type: question.type,
    options: question.options ?? [],
    modelAnswer: question.openConfig?.modelAnswer ?? '',
    keyConcepts: question.openConfig?.keyConcepts ?? [],
    expectedExpressions: question.openConfig?.expectedExpressions ?? [],
    correctAnswers: question.choiceConfig?.correctAnswers ?? []
  }));

  return [
    `Translate this questionnaire from Spanish into ${targetLanguage}.`,
    'Return only valid JSON with this exact shape:',
    '{"title":"string","description":"string","questions":[{"text":"string","type":"open|single|multiple","modelAnswer":"string","keyConcepts":["string"],"expectedExpressions":["string"],"options":["string"],"correctAnswers":["string"]}]}',
    'Rules:',
    '- Preserve the original question order and type.',
    '- Translate titles, descriptions, question texts, model answers, options, and key concepts.',
    '- Keep code snippets, tags, API names, and syntax tokens unchanged when they should remain literal.',
    '- For expectedExpressions, only translate natural language when needed; preserve technical literals exactly.',
    '- For single and multiple choice questions, correctAnswers must match the translated options exactly.',
    '- For open questions, include modelAnswer, keyConcepts, and expectedExpressions.',
    '- For single and multiple choice questions, include options and correctAnswers.',
    '- Do not add explanations, markdown, or extra keys.',
    `Source questionnaire: ${JSON.stringify({
      title: questionnaire.title,
      description: questionnaire.description,
      questions: serializableQuestions
    })}`
  ].join('\n');
}

export async function translateQuestionnaire(
  questionnaire: QuestionnaireDetail,
  language: SupportedTranslationLanguage
) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Falta GEMINI_API_KEY para duplicar y traducir cuestionarios automaticamente.'
    );
  }

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildPrompt(questionnaire, language)
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('No se pudo conectar con Gemini para traducir el cuestionario.');
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!rawText) {
    throw new Error('Gemini no devolvio contenido para la traduccion.');
  }

  return parseTranslatedQuestionnaire(rawText);
}

