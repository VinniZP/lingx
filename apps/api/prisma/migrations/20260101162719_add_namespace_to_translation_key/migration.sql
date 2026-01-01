/*
  Warnings:

  - A unique constraint covering the columns `[branchId,namespace,name]` on the table `TranslationKey` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TranslationKey_branchId_name_key";

-- AlterTable
ALTER TABLE "TranslationKey" ADD COLUMN     "namespace" TEXT;

-- CreateIndex
CREATE INDEX "TranslationKey_branchId_namespace_idx" ON "TranslationKey"("branchId", "namespace");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationKey_branchId_namespace_name_key" ON "TranslationKey"("branchId", "namespace", "name");
