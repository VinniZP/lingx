/*
  Warnings:

  - You are about to drop the `GlossaryProviderSync` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GlossaryProviderSync" DROP CONSTRAINT "GlossaryProviderSync_projectId_fkey";

-- DropTable
DROP TABLE "GlossaryProviderSync";
