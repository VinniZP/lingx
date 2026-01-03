-- CreateIndex
CREATE INDEX "TranslationQualityScore_contentHash_idx" ON "TranslationQualityScore"("contentHash");

-- CreateIndex
CREATE INDEX "TranslationQualityScore_translationId_contentHash_idx" ON "TranslationQualityScore"("translationId", "contentHash");
