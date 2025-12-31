-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'translation_approve';
ALTER TYPE "ActivityType" ADD VALUE 'translation_reject';

-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "statusUpdatedBy" TEXT;

-- CreateIndex
CREATE INDEX "Translation_status_idx" ON "Translation"("status");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_statusUpdatedBy_fkey" FOREIGN KEY ("statusUpdatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
