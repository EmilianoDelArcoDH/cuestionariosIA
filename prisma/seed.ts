import { PrismaClient } from '@prisma/client';
// @ts-ignore -- ts-node --esm requiere la extension explicita en runtime
import { seedQuestionnaires } from '../lib/seedData.ts';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.questionnaire.count();

  if (existing > 0) {
    console.log('Seed omitido: ya existen cuestionarios.');
    return;
  }

  for (const questionnaire of seedQuestionnaires) {
    await prisma.questionnaire.create({
      data: {
        title: questionnaire.title,
        description: questionnaire.description,
        questions: {
          create: questionnaire.questions.map((question, index) => ({
            text: question.text,
            type: question.type,
            position: index,
            modelAnswer: question.type === 'open' ? question.modelAnswer : null,
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
      }
    });
  }

  console.log(`Seed completado: ${seedQuestionnaires.length} cuestionarios creados.`);
}

main()
  .catch((error) => {
    console.error('Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
