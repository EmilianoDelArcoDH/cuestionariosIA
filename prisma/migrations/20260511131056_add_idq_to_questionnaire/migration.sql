/*
  Warnings:

  - A unique constraint covering the columns `[idq]` on the table `Questionnaire` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Questionnaire" ADD COLUMN     "idq" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Questionnaire_idq_key" ON "Questionnaire"("idq");
