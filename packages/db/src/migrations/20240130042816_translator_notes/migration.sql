-- CreateTable
CREATE TABLE "TranslatorNote" (
    "content" TEXT NOT NULL,
    "lastEditedAt" TIMESTAMP(3) NOT NULL,
    "wordId" TEXT NOT NULL,
    "languageId" UUID NOT NULL,
    "lastAuthorId" UUID NOT NULL,

    CONSTRAINT "TranslatorNote_pkey" PRIMARY KEY ("wordId","languageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranslatorNote_wordId_key" ON "TranslatorNote"("wordId");

-- AddForeignKey
ALTER TABLE "TranslatorNote" ADD CONSTRAINT "TranslatorNote_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslatorNote" ADD CONSTRAINT "TranslatorNote_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslatorNote" ADD CONSTRAINT "TranslatorNote_lastAuthorId_fkey" FOREIGN KEY ("lastAuthorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
