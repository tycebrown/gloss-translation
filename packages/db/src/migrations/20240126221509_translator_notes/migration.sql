-- CreateTable
CREATE TABLE "TranslatorNotes" (
    "wordId" TEXT NOT NULL,
    "languageId" UUID NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "TranslatorNotes_pkey" PRIMARY KEY ("wordId","languageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranslatorNotes_wordId_key" ON "TranslatorNotes"("wordId");

-- AddForeignKey
ALTER TABLE "TranslatorNotes" ADD CONSTRAINT "TranslatorNotes_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslatorNotes" ADD CONSTRAINT "TranslatorNotes_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
