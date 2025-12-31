-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "TranslationMemory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceKeyId" TEXT,
    "sourceBranchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationMemory_projectId_sourceLanguage_targetLanguage_idx" ON "TranslationMemory"("projectId", "sourceLanguage", "targetLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationMemory_projectId_sourceLanguage_targetLanguage_s_key" ON "TranslationMemory"("projectId", "sourceLanguage", "targetLanguage", "sourceText");

-- AddForeignKey
ALTER TABLE "TranslationMemory" ADD CONSTRAINT "TranslationMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for pg_trgm similarity search
CREATE INDEX "TranslationMemory_sourceText_trgm_idx" ON "TranslationMemory" USING gin ("sourceText" gin_trgm_ops);
