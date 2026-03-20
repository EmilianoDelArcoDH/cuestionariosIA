import { prisma } from '@/lib/prisma';

export type PersistedQuestionType = 'open' | 'single' | 'multiple';

export type CreateQuestionInput =
  | {
      text: string;
      type: 'open';
      modelAnswer: string;
      keyConcepts: string[];
      expectedExpressions: string[];
    }
  | {
      text: string;
      type: 'single' | 'multiple';
      options: string[];
      correctAnswers: string[];
    };

type QuestionOptionRecord = {
  text: string;
  isCorrect: boolean;
  position: number;
};

type QuestionRecord = {
  id: number;
  text: string;
  type: PersistedQuestionType;
  modelAnswer?: string | null;
  keyConcepts?: string[];
  expectedExpressions?: string[];
  options?: QuestionOptionRecord[];
};

type QuestionnaireRecord = {
  id: number;
  title: string;
  description: string;
  questions: QuestionRecord[];
};

const db = prisma as any;

function mapQuestion(question: QuestionRecord) {
  const options = question.options ?? [];

  return {
    id: question.id,
    text: question.text,
    type: question.type,
    options: options.map((option: QuestionOptionRecord) => option.text),
    openConfig:
      question.type === 'open'
        ? {
            modelAnswer: question.modelAnswer ?? '',
            keyConcepts: question.keyConcepts ?? [],
            expectedExpressions: question.expectedExpressions ?? []
          }
        : undefined,
    choiceConfig:
      question.type === 'single' || question.type === 'multiple'
        ? {
            correctAnswers: options
              .filter((option: QuestionOptionRecord) => option.isCorrect)
              .map((option: QuestionOptionRecord) => option.text)
          }
        : undefined
  };
}

function mapQuestionnaireSummary(questionnaire: {
  id: number;
  title: string;
  description: string;
}) {
  return {
    id: questionnaire.id,
    title: questionnaire.title,
    description: questionnaire.description
  };
}

function mapQuestionnaireDetail(questionnaire: QuestionnaireRecord) {
  return {
    ...mapQuestionnaireSummary(questionnaire),
    questions: questionnaire.questions.map(mapQuestion)
  };
}

export async function getQuestionnaires() {
  const questionnaires = (await db.questionnaire.findMany({
    orderBy: {
      id: 'asc'
    },
    select: {
      id: true,
      title: true,
      description: true
    }
  })) as Array<{ id: number; title: string; description: string }>;

  return questionnaires.map(mapQuestionnaireSummary);
}

export async function getQuestionnaireById(id: number) {
  const questionnaire = (await db.questionnaire.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: {
          position: 'asc'
        },
        include: {
          options: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      }
    }
  })) as QuestionnaireRecord | null;

  return questionnaire ? mapQuestionnaireDetail(questionnaire) : null;
}

export async function getQuestionsByQuestionnaireId(id: number) {
  const questionnaire = await getQuestionnaireById(id);
  return questionnaire ? questionnaire.questions : [];
}

export async function findQuestionById(questionId: number) {
  const question = (await db.question.findUnique({
    where: { id: questionId },
    include: {
      options: {
        orderBy: {
          position: 'asc'
        }
      }
    }
  })) as QuestionRecord | null;

  return question ? mapQuestion(question) : null;
}

export async function createQuestionnaire(input: {
  title: string;
  description: string;
  questions: CreateQuestionInput[];
}) {
  const created = (await db.questionnaire.create({
    data: {
      title: input.title.trim(),
      description: input.description.trim(),
      questions: {
        create: input.questions.map((question, index) => ({
          text: question.text.trim(),
          type: question.type,
          position: index,
          modelAnswer: question.type === 'open' ? question.modelAnswer.trim() : null,
          keyConcepts: question.type === 'open' ? question.keyConcepts : [],
          expectedExpressions:
            question.type === 'open' ? question.expectedExpressions : [],
          options:
            question.type === 'single' || question.type === 'multiple'
              ? {
                  create: question.options.map((option, optionIndex) => ({
                    text: option,
                    isCorrect: question.correctAnswers.includes(option),
                    position: optionIndex
                  }))
                }
              : undefined
        }))
      }
    },
    include: {
      questions: {
        orderBy: {
          position: 'asc'
        },
        include: {
          options: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      }
    }
  })) as QuestionnaireRecord;

  return mapQuestionnaireDetail(created);
}

export async function updateQuestionnaire(
  id: number,
  input: {
    title: string;
    description: string;
    questions: CreateQuestionInput[];
  }
) {
  const updated = await db.$transaction(async (tx: any) => {
    await tx.questionOption.deleteMany({
      where: {
        question: {
          questionnaireId: id
        }
      }
    });

    await tx.question.deleteMany({
      where: {
        questionnaireId: id
      }
    });

    return tx.questionnaire.update({
      where: { id },
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        questions: {
          create: input.questions.map((question, index) => ({
            text: question.text.trim(),
            type: question.type,
            position: index,
            modelAnswer: question.type === 'open' ? question.modelAnswer.trim() : null,
            keyConcepts: question.type === 'open' ? question.keyConcepts : [],
            expectedExpressions:
              question.type === 'open' ? question.expectedExpressions : [],
            options:
              question.type === 'single' || question.type === 'multiple'
                ? {
                    create: question.options.map((option, optionIndex) => ({
                      text: option,
                      isCorrect: question.correctAnswers.includes(option),
                      position: optionIndex
                    }))
                  }
                : undefined
          }))
        }
      },
      include: {
        questions: {
          orderBy: {
            position: 'asc'
          },
          include: {
            options: {
              orderBy: {
                position: 'asc'
              }
            }
          }
        }
      }
    });
  });

  return mapQuestionnaireDetail(updated as QuestionnaireRecord);
}

export async function deleteQuestionnaire(id: number) {
  await db.questionnaire.delete({
    where: { id }
  });
}

export async function getDashboardSummary() {
  const [quizzesCount, questionsCount, openQuestionsCount, closedQuestionsCount] =
    (await Promise.all([
      db.questionnaire.count(),
      db.question.count(),
      db.question.count({ where: { type: 'open' } }),
      db.question.count({
        where: {
          type: {
            in: ['single', 'multiple']
          }
        }
      })
    ])) as [number, number, number, number];

  const sampleQuestions = (await db.question.findMany({
    take: 3,
    orderBy: [{ createdAt: 'asc' }]
  })) as Array<{ id: number; text: string; type: PersistedQuestionType }>;

  return {
    quizzesCount,
    questionsCount,
    attemptsCount: 0,
    passRate: 0,
    topErrorQuestions: sampleQuestions.map((question) => ({
      id: question.id,
      title: question.text,
      errorRate: question.type === 'open' ? 0.45 : 0.25
    })),
    mostMissingConcepts: [
      { concept: 'conceptos clave', count: openQuestionsCount },
      { concept: 'respuesta correcta', count: closedQuestionsCount }
    ].filter((item) => item.count > 0)
  };
}
