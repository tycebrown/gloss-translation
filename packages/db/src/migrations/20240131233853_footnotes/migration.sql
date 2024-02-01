-- CreateTable
CREATE TABLE "Footnote" (
    "content" TEXT NOT NULL,
    "lastEditedAt" TIMESTAMP(3) NOT NULL,
    "wordId" TEXT NOT NULL,
    "languageId" UUID NOT NULL,
    "lastAuthorId" UUID NOT NULL,

    CONSTRAINT "Footnote_pkey" PRIMARY KEY ("wordId","languageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Footnote_wordId_key" ON "Footnote"("wordId");

-- AddForeignKey
ALTER TABLE "Footnote" ADD CONSTRAINT "Footnote_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Footnote" ADD CONSTRAINT "Footnote_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Footnote" ADD CONSTRAINT "Footnote_lastAuthorId_fkey" FOREIGN KEY ("lastAuthorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
