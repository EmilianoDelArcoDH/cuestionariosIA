import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const questionnaires = await prisma.questionnaire.findMany({
    where: {
      idq: null,
    },
  });

  console.log(`Encontrados ${questionnaires.length} cuestionarios sin idq`);

  for (const questionnaire of questionnaires) {
    const newIdq = randomUUID();

    await prisma.questionnaire.update({
      where: {
        id: questionnaire.id,
      },
      data: {
        idq: newIdq,
      },
    });

    console.log(
      `Questionnaire ${questionnaire.id} actualizado con idq: ${newIdq}`
    );
  }

  console.log("Proceso terminado");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });