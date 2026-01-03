-- CreateTable
CREATE TABLE "TranslationQualityScore" (
    "id" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracyScore" INTEGER,
    "fluencyScore" INTEGER,
    "terminologyScore" INTEGER,
    "formatScore" INTEGER NOT NULL,
    "evaluationType" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "issues" JSONB NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationQualityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityScoringConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scoreAfterAITranslation" BOOLEAN NOT NULL DEFAULT true,
    "scoreBeforeMerge" BOOLEAN NOT NULL DEFAULT false,
    "autoApproveThreshold" INTEGER NOT NULL DEFAULT 80,
    "flagThreshold" INTEGER NOT NULL DEFAULT 60,
    "aiEvaluationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiEvaluationProvider" TEXT,
    "aiEvaluationModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranslationQualityScore_translationId_key" ON "TranslationQualityScore"("translationId");

-- CreateIndex
CREATE INDEX "TranslationQualityScore_score_idx" ON "TranslationQualityScore"("score");

-- CreateIndex
CREATE INDEX "TranslationQualityScore_evaluationType_idx" ON "TranslationQualityScore"("evaluationType");

-- CreateIndex
CREATE UNIQUE INDEX "QualityScoringConfig_projectId_key" ON "QualityScoringConfig"("projectId");

-- AddForeignKey
ALTER TABLE "TranslationQualityScore" ADD CONSTRAINT "TranslationQualityScore_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "Translation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityScoringConfig" ADD CONSTRAINT "QualityScoringConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
