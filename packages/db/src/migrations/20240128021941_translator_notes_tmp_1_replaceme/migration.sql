/*
  Warnings:

  - Added the required column `lastAuthorId` to the `TranslatorNotes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEditedAt` to the `TranslatorNotes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TranslatorNotes" ADD COLUMN     "lastAuthorId" UUID NOT NULL,
ADD COLUMN     "lastEditedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "TranslatorNotes" ADD CONSTRAINT "TranslatorNotes_lastAuthorId_fkey" FOREIGN KEY ("lastAuthorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;