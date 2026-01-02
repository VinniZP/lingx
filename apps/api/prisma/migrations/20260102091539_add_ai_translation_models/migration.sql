-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE_AI', 'MISTRAL');

-- CreateTable
CREATE TABLE "AITranslationConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiKeyIv" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AITranslationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIContextConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "includeGlossary" BOOLEAN NOT NULL DEFAULT true,
    "glossaryLimit" INTEGER NOT NULL DEFAULT 10,
    "includeTM" BOOLEAN NOT NULL DEFAULT true,
    "tmLimit" INTEGER NOT NULL DEFAULT 5,
    "tmMinSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "includeRelatedKeys" BOOLEAN NOT NULL DEFAULT true,
    "relatedKeysLimit" INTEGER NOT NULL DEFAULT 5,
    "includeDescription" BOOLEAN NOT NULL DEFAULT true,
    "customInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIContextConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITranslationCache" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "sourceTextHash" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AITranslationCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITranslationUsage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "inputTokens" BIGINT NOT NULL DEFAULT 0,
    "outputTokens" BIGINT NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AITranslationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AITranslationConfig_projectId_idx" ON "AITranslationConfig"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AITranslationConfig_projectId_provider_key" ON "AITranslationConfig"("projectId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AIContextConfig_projectId_key" ON "AIContextConfig"("projectId");

-- CreateIndex
CREATE INDEX "AITranslationCache_projectId_provider_sourceLanguage_target_idx" ON "AITranslationCache"("projectId", "provider", "sourceLanguage", "targetLanguage");

-- CreateIndex
CREATE INDEX "AITranslationCache_expiresAt_idx" ON "AITranslationCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AITranslationCache_projectId_provider_model_sourceLanguage__key" ON "AITranslationCache"("projectId", "provider", "model", "sourceLanguage", "targetLanguage", "sourceTextHash");

-- CreateIndex
CREATE INDEX "AITranslationUsage_projectId_yearMonth_idx" ON "AITranslationUsage"("projectId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "AITranslationUsage_projectId_provider_model_yearMonth_key" ON "AITranslationUsage"("projectId", "provider", "model", "yearMonth");

-- AddForeignKey
ALTER TABLE "AITranslationConfig" ADD CONSTRAINT "AITranslationConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIContextConfig" ADD CONSTRAINT "AIContextConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
