-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'CONJUNCTION', 'INTERJECTION', 'DETERMINER', 'OTHER');

-- CreateTable
CREATE TABLE "GlossaryEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceTerm" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "context" TEXT,
    "notes" TEXT,
    "partOfSpeech" "PartOfSpeech",
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "domain" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTranslation" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "targetTerm" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTag" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlossaryTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryEntryTag" (
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "GlossaryEntryTag_pkey" PRIMARY KEY ("entryId","tagId")
);

-- CreateTable
CREATE TABLE "GlossaryProviderSync" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "MTProvider" NOT NULL,
    "externalGlossaryId" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "entriesCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryProviderSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlossaryEntry_projectId_sourceLanguage_idx" ON "GlossaryEntry"("projectId", "sourceLanguage");

-- CreateIndex
CREATE INDEX "GlossaryEntry_projectId_idx" ON "GlossaryEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryEntry_projectId_sourceLanguage_sourceTerm_key" ON "GlossaryEntry"("projectId", "sourceLanguage", "sourceTerm");

-- CreateIndex
CREATE INDEX "GlossaryTranslation_entryId_idx" ON "GlossaryTranslation"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTranslation_entryId_targetLanguage_key" ON "GlossaryTranslation"("entryId", "targetLanguage");

-- CreateIndex
CREATE INDEX "GlossaryTag_projectId_idx" ON "GlossaryTag"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTag_projectId_name_key" ON "GlossaryTag"("projectId", "name");

-- CreateIndex
CREATE INDEX "GlossaryEntryTag_entryId_idx" ON "GlossaryEntryTag"("entryId");

-- CreateIndex
CREATE INDEX "GlossaryEntryTag_tagId_idx" ON "GlossaryEntryTag"("tagId");

-- CreateIndex
CREATE INDEX "GlossaryProviderSync_projectId_provider_idx" ON "GlossaryProviderSync"("projectId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryProviderSync_projectId_provider_sourceLanguage_targ_key" ON "GlossaryProviderSync"("projectId", "provider", "sourceLanguage", "targetLanguage");

-- AddForeignKey
ALTER TABLE "GlossaryEntry" ADD CONSTRAINT "GlossaryEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTranslation" ADD CONSTRAINT "GlossaryTranslation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GlossaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTag" ADD CONSTRAINT "GlossaryTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryEntryTag" ADD CONSTRAINT "GlossaryEntryTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GlossaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryEntryTag" ADD CONSTRAINT "GlossaryEntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "GlossaryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryProviderSync" ADD CONSTRAINT "GlossaryProviderSync_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
