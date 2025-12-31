-- CreateEnum
CREATE TYPE "MTProvider" AS ENUM ('DEEPL', 'GOOGLE_TRANSLATE');

-- CreateTable
CREATE TABLE "MachineTranslationConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "MTProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiKeyIv" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineTranslationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineTranslationCache" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "MTProvider" NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "sourceTextHash" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "characterCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineTranslationCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineTranslationUsage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "MTProvider" NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "characterCount" BIGINT NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "cachedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineTranslationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MachineTranslationConfig_projectId_idx" ON "MachineTranslationConfig"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MachineTranslationConfig_projectId_provider_key" ON "MachineTranslationConfig"("projectId", "provider");

-- CreateIndex
CREATE INDEX "MachineTranslationCache_projectId_provider_sourceLanguage_t_idx" ON "MachineTranslationCache"("projectId", "provider", "sourceLanguage", "targetLanguage");

-- CreateIndex
CREATE INDEX "MachineTranslationCache_expiresAt_idx" ON "MachineTranslationCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MachineTranslationCache_projectId_provider_sourceLanguage_t_key" ON "MachineTranslationCache"("projectId", "provider", "sourceLanguage", "targetLanguage", "sourceTextHash");

-- CreateIndex
CREATE INDEX "MachineTranslationUsage_projectId_yearMonth_idx" ON "MachineTranslationUsage"("projectId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MachineTranslationUsage_projectId_provider_yearMonth_key" ON "MachineTranslationUsage"("projectId", "provider", "yearMonth");

-- AddForeignKey
ALTER TABLE "MachineTranslationConfig" ADD CONSTRAINT "MachineTranslationConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
