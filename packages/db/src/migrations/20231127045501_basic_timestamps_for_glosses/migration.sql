-- AlterTable
ALTER TABLE "Gloss" ADD COLUMN     "createdAt" TIMESTAMP(3),
ADD COLUMN     "lastUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "lastUpdatedById" UUID;

-- AddForeignKey
ALTER TABLE "Gloss" ADD CONSTRAINT "Gloss_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
