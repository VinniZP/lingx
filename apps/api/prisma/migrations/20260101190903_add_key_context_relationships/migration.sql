-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SAME_FILE', 'SAME_COMPONENT', 'SEMANTIC');

-- AlterTable
ALTER TABLE "TranslationKey" ADD COLUMN     "sourceComponent" TEXT,
ADD COLUMN     "sourceFile" TEXT,
ADD COLUMN     "sourceLine" INTEGER;

-- CreateTable
CREATE TABLE "KeyRelationship" (
    "id" TEXT NOT NULL,
    "fromKeyId" TEXT NOT NULL,
    "toKeyId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeyRelationship_fromKeyId_idx" ON "KeyRelationship"("fromKeyId");

-- CreateIndex
CREATE INDEX "KeyRelationship_toKeyId_idx" ON "KeyRelationship"("toKeyId");

-- CreateIndex
CREATE INDEX "KeyRelationship_type_idx" ON "KeyRelationship"("type");

-- CreateIndex
CREATE UNIQUE INDEX "KeyRelationship_fromKeyId_toKeyId_type_key" ON "KeyRelationship"("fromKeyId", "toKeyId", "type");

-- CreateIndex
CREATE INDEX "TranslationKey_sourceFile_idx" ON "TranslationKey"("sourceFile");

-- CreateIndex
CREATE INDEX "TranslationKey_sourceComponent_idx" ON "TranslationKey"("sourceComponent");

-- AddForeignKey
ALTER TABLE "KeyRelationship" ADD CONSTRAINT "KeyRelationship_fromKeyId_fkey" FOREIGN KEY ("fromKeyId") REFERENCES "TranslationKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyRelationship" ADD CONSTRAINT "KeyRelationship_toKeyId_fkey" FOREIGN KEY ("toKeyId") REFERENCES "TranslationKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
