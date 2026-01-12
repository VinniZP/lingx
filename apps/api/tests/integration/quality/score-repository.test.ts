/**
 * Score Repository Integration Tests
 *
 * Tests quality score persistence with real database operations.
 */

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreRepository } from '../../../src/modules/quality-estimation/quality/persistence/score-repository.js';
import { disconnectTestPrisma, getTestPrismaClient } from '../../helpers/prisma.js';

// Use the test database (set up by vitest globalSetup)
const prisma = getTestPrismaClient();

// Disconnect after all tests
afterAll(async () => {
  await disconnectTestPrisma();
});

describe('ScoreRepository', () => {
  let repo: ScoreRepository;
  let testProjectId: string;
  let testBranchId: string;
  let testKeyId: string;
  let testTranslationId: string;

  // Set up test data before each test
  beforeEach(async () => {
    repo = new ScoreRepository(prisma);

    // Create test project with languages
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        slug: `test-project-${Date.now()}`,
        defaultLanguage: 'en',
        languages: {
          create: [
            { code: 'en', name: 'English' },
            { code: 'de', name: 'German' },
            { code: 'fr', name: 'French' },
            { code: 'es', name: 'Spanish' },
          ],
        },
      },
    });
    testProjectId = project.id;

    // Create test space
    const space = await prisma.space.create({
      data: {
        name: 'Test Space',
        slug: `test-space-${Date.now()}`,
        projectId: project.id,
      },
    });

    // Create test branch
    const branch = await prisma.branch.create({
      data: {
        name: 'main',
        slug: 'main',
        spaceId: space.id,
        isDefault: true,
      },
    });
    testBranchId = branch.id;

    // Create test key
    const key = await prisma.translationKey.create({
      data: {
        name: 'test.key',
        branchId: branch.id,
      },
    });
    testKeyId = key.id;

    // Create test translation
    const translation = await prisma.translation.create({
      data: {
        keyId: key.id,
        language: 'de',
        value: 'Test Übersetzung',
      },
    });
    testTranslationId = translation.id;
  });

  // Clean up after each test
  afterEach(async () => {
    // Delete in reverse order of dependencies
    await prisma.translationQualityScore.deleteMany({});
    await prisma.translation.deleteMany({});
    await prisma.translationKey.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.space.deleteMany({});
    await prisma.projectLanguage.deleteMany({
      where: { projectId: testProjectId },
    });
    await prisma.project.deleteMany({
      where: { id: testProjectId },
    });
  });

  // ============================================
  // save
  // ============================================

  describe('save', () => {
    it('should create a new quality score', async () => {
      const result = await repo.save(testTranslationId, {
        score: 85,
        format: 85,
        issues: [],
        evaluationType: 'heuristic',
        contentHash: 'hash123',
      });

      expect(result.score).toBe(85);
      expect(result.format).toBe(85);
      expect(result.evaluationType).toBe('heuristic');
      expect(result.passed).toBe(true);
      expect(result.cached).toBe(false);

      // Verify in database
      const stored = await prisma.translationQualityScore.findUnique({
        where: { translationId: testTranslationId },
      });
      expect(stored).not.toBeNull();
      expect(stored!.score).toBe(85);
      expect(stored!.contentHash).toBe('hash123');
    });

    it('should update an existing quality score', async () => {
      // First save
      await repo.save(testTranslationId, {
        score: 70,
        issues: [],
        evaluationType: 'heuristic',
      });

      // Update
      const result = await repo.save(testTranslationId, {
        score: 95,
        accuracy: 98,
        fluency: 92,
        terminology: 95,
        format: 90,
        issues: [],
        evaluationType: 'ai',
        provider: 'ANTHROPIC',
        model: 'claude-3-5-sonnet',
        inputTokens: 500,
        outputTokens: 100,
        contentHash: 'newhash',
      });

      expect(result.score).toBe(95);
      expect(result.accuracy).toBe(98);
      expect(result.fluency).toBe(92);
      expect(result.evaluationType).toBe('ai');

      // Verify only one record exists
      const count = await prisma.translationQualityScore.count({
        where: { translationId: testTranslationId },
      });
      expect(count).toBe(1);

      // Verify updated values
      const stored = await prisma.translationQualityScore.findUnique({
        where: { translationId: testTranslationId },
      });
      expect(stored!.score).toBe(95);
      expect(stored!.provider).toBe('ANTHROPIC');
      expect(stored!.contentHash).toBe('newhash');
    });

    it('should save issues as JSON', async () => {
      const issues = [
        { type: 'placeholder' as const, severity: 'error' as const, message: 'Missing {name}' },
        { type: 'length' as const, severity: 'warning' as const, message: 'Too long' },
      ];

      await repo.save(testTranslationId, {
        score: 60,
        issues,
        evaluationType: 'heuristic',
      });

      const stored = await prisma.translationQualityScore.findUnique({
        where: { translationId: testTranslationId },
      });

      const storedIssues = stored!.issues as unknown as typeof issues;
      expect(storedIssues).toHaveLength(2);
      expect(storedIssues[0].type).toBe('placeholder');
      expect(storedIssues[0].message).toBe('Missing {name}');
    });

    it('should set passed=true for scores >= 80', async () => {
      const result = await repo.save(testTranslationId, {
        score: 80,
        issues: [],
        evaluationType: 'heuristic',
      });

      expect(result.passed).toBe(true);
    });

    it('should set passed=false for scores < 80', async () => {
      const result = await repo.save(testTranslationId, {
        score: 79,
        issues: [],
        evaluationType: 'heuristic',
      });

      expect(result.passed).toBe(false);
    });
  });

  // ============================================
  // findByTranslationId
  // ============================================

  describe('findByTranslationId', () => {
    it('should return null for non-existent score', async () => {
      const result = await repo.findByTranslationId(testTranslationId);
      expect(result).toBeNull();
    });

    it('should return score with content hash', async () => {
      await repo.save(testTranslationId, {
        score: 90,
        accuracy: 95,
        fluency: 88,
        terminology: 87,
        format: 90,
        issues: [],
        evaluationType: 'ai',
        contentHash: 'testhash123',
      });

      const result = await repo.findByTranslationId(testTranslationId);

      expect(result).not.toBeNull();
      expect(result!.score.score).toBe(90);
      expect(result!.score.accuracy).toBe(95);
      expect(result!.score.fluency).toBe(88);
      expect(result!.score.terminology).toBe(87);
      expect(result!.score.cached).toBe(true);
      expect(result!.contentHash).toBe('testhash123');
    });

    it('should return null content hash if not set', async () => {
      await repo.save(testTranslationId, {
        score: 85,
        issues: [],
        evaluationType: 'heuristic',
      });

      const result = await repo.findByTranslationId(testTranslationId);

      expect(result).not.toBeNull();
      expect(result!.contentHash).toBeNull();
    });
  });

  // ============================================
  // getBranchSummary
  // ============================================

  describe('getBranchSummary', () => {
    it('should return zeros for branch with no scores', async () => {
      const summary = await repo.getBranchSummary(testBranchId);

      expect(summary.averageScore).toBe(0);
      expect(summary.distribution.excellent).toBe(0);
      expect(summary.distribution.good).toBe(0);
      expect(summary.distribution.needsReview).toBe(0);
      expect(summary.totalScored).toBe(0);
      expect(summary.totalTranslations).toBe(1); // We have one translation
    });

    it('should calculate correct distribution', async () => {
      // Create additional translations with different scores
      const translation2 = await prisma.translation.create({
        data: {
          keyId: testKeyId,
          language: 'fr',
          value: 'Traduction test',
        },
      });

      const translation3 = await prisma.translation.create({
        data: {
          keyId: testKeyId,
          language: 'es',
          value: 'Traducción de prueba',
        },
      });

      // Save scores: 90 (excellent), 70 (good), 50 (needsReview)
      await repo.save(testTranslationId, {
        score: 90,
        issues: [],
        evaluationType: 'ai',
      });

      await repo.save(translation2.id, {
        score: 70,
        issues: [],
        evaluationType: 'heuristic',
      });

      await repo.save(translation3.id, {
        score: 50,
        issues: [
          { type: 'accuracy' as const, severity: 'error' as const, message: 'Poor quality' },
        ],
        evaluationType: 'heuristic',
      });

      const summary = await repo.getBranchSummary(testBranchId);

      expect(summary.distribution.excellent).toBe(1);
      expect(summary.distribution.good).toBe(1);
      expect(summary.distribution.needsReview).toBe(1);
      expect(summary.totalScored).toBe(3);
      expect(summary.totalTranslations).toBe(3);
      expect(summary.averageScore).toBe(70); // (90+70+50)/3 = 70
    });

    it('should calculate per-language averages', async () => {
      // Create another key with translations
      const key2 = await prisma.translationKey.create({
        data: {
          name: 'test.key2',
          branchId: testBranchId,
        },
      });

      const deTranslation2 = await prisma.translation.create({
        data: {
          keyId: key2.id,
          language: 'de',
          value: 'Zweite Übersetzung',
        },
      });

      // Save scores for German translations
      await repo.save(testTranslationId, {
        score: 80,
        issues: [],
        evaluationType: 'heuristic',
      });

      await repo.save(deTranslation2.id, {
        score: 90,
        issues: [],
        evaluationType: 'ai',
      });

      const summary = await repo.getBranchSummary(testBranchId);

      expect(summary.byLanguage['de']).toBeDefined();
      expect(summary.byLanguage['de'].count).toBe(2);
      expect(summary.byLanguage['de'].average).toBe(85); // (80+90)/2
    });
  });

  // ============================================
  // delete
  // ============================================

  describe('delete', () => {
    it('should delete a quality score', async () => {
      await repo.save(testTranslationId, {
        score: 85,
        issues: [],
        evaluationType: 'heuristic',
      });

      await repo.delete(testTranslationId);

      const result = await repo.findByTranslationId(testTranslationId);
      expect(result).toBeNull();
    });

    it('should not fail when deleting non-existent score', async () => {
      await expect(repo.delete(testTranslationId)).resolves.not.toThrow();
    });
  });

  // ============================================
  // deleteByBranch
  // ============================================

  describe('deleteByBranch', () => {
    it('should delete all scores for a branch', async () => {
      // Create another translation
      const translation2 = await prisma.translation.create({
        data: {
          keyId: testKeyId,
          language: 'fr',
          value: 'Traduction',
        },
      });

      // Save scores
      await repo.save(testTranslationId, {
        score: 85,
        issues: [],
        evaluationType: 'heuristic',
      });

      await repo.save(translation2.id, {
        score: 90,
        issues: [],
        evaluationType: 'ai',
      });

      // Delete all
      const count = await repo.deleteByBranch(testBranchId);

      expect(count).toBe(2);

      // Verify deleted
      const result1 = await repo.findByTranslationId(testTranslationId);
      const result2 = await repo.findByTranslationId(translation2.id);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should return 0 when no scores to delete', async () => {
      const count = await repo.deleteByBranch(testBranchId);
      expect(count).toBe(0);
    });
  });

  // ============================================
  // formatStoredScore
  // ============================================

  describe('formatStoredScore', () => {
    it('should format all score dimensions', async () => {
      await repo.save(testTranslationId, {
        score: 88,
        accuracy: 92,
        fluency: 85,
        terminology: 87,
        format: 90,
        issues: [{ type: 'length' as const, severity: 'info' as const, message: 'Slightly long' }],
        evaluationType: 'ai',
      });

      const stored = await prisma.translationQualityScore.findUnique({
        where: { translationId: testTranslationId },
      });

      const formatted = repo.formatStoredScore(stored!);

      expect(formatted.score).toBe(88);
      expect(formatted.accuracy).toBe(92);
      expect(formatted.fluency).toBe(85);
      expect(formatted.terminology).toBe(87);
      expect(formatted.format).toBe(90);
      expect(formatted.passed).toBe(true);
      expect(formatted.cached).toBe(true);
      expect(formatted.needsAIEvaluation).toBe(false);
      expect(formatted.evaluationType).toBe('ai');
      expect(formatted.issues).toHaveLength(1);
    });

    it('should handle null optional fields', async () => {
      await repo.save(testTranslationId, {
        score: 75,
        issues: [],
        evaluationType: 'heuristic',
      });

      const stored = await prisma.translationQualityScore.findUnique({
        where: { translationId: testTranslationId },
      });

      const formatted = repo.formatStoredScore(stored!);

      expect(formatted.accuracy).toBeUndefined();
      expect(formatted.fluency).toBeUndefined();
      expect(formatted.terminology).toBeUndefined();
    });
  });
});
