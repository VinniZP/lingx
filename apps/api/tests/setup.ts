/**
 * Global Test Setup
 *
 * Handles test database and Redis initialization and cleanup.
 * Runs before all tests and after all tests complete.
 */
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import Redis from 'ioredis';

// Load environment variables
dotenv.config();

// Set NODE_ENV for the setup process
process.env.NODE_ENV = 'test';

/**
 * Verify test environment
 */
function verifyTestEnvironment(): void {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      'TEST_DATABASE_URL is required for running tests. ' +
        'Add it to your .env file (see .env.example)'
    );
  }

  // Ensure we're not accidentally using production database
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl.includes('schema=test') && !testUrl.includes('_test')) {
    console.warn(
      '⚠️  Warning: TEST_DATABASE_URL does not contain "schema=test" or "_test". ' +
        'Make sure you are using an isolated test database!'
    );
  }
}

/**
 * Apply Prisma migrations to test database
 */
async function applyMigrations(): Promise<void> {
  console.log('📦 Applying migrations to test database...');

  try {
    // Use Prisma migrate deploy for test database
    // This applies existing migrations without prompting
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    console.log('✅ Migrations applied successfully');
  } catch (error) {
    // If migrations fail, try db push for development
    console.log('⚠️  migrate deploy failed, trying db push...');
    try {
      // For tests, accept data loss (safe for test databases)
      execSync('npx prisma db push --accept-data-loss', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.TEST_DATABASE_URL,
        },
        stdio: 'pipe',
        cwd: process.cwd(),
      });
      console.log('✅ Schema pushed successfully');
    } catch (pushError) {
      console.error('❌ Failed to apply database schema:', pushError);
      throw pushError;
    }
  }
}

/**
 * Clean all keys in the test Redis database
 * Uses database 1 to isolate from development (database 0)
 */
async function cleanRedis(): Promise<void> {
  console.log('🧹 Cleaning test Redis...');

  const testRedisUrl = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  const redis = new Redis(testRedisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redis.flushdb(); // Only flushes the current database (db 1), not all databases
    console.log('✅ Redis cleaned');
  } catch (error) {
    console.warn('⚠️  Could not clean Redis:', (error as Error).message);
    console.warn('   Tests that depend on Redis may fail if state is polluted.');
    console.warn('   This is expected if Redis is not running locally.');
  } finally {
    await redis.quit().catch(() => {
      // Ignore quit errors - connection may have already failed
    });
  }
}

/**
 * Clean all tables in the test database using raw SQL
 * This is done via Prisma but with a fresh connection
 */
async function cleanDatabase(): Promise<void> {
  console.log('🧹 Cleaning test database...');

  try {
    // Use prisma client dynamically to clean database
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');

    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      max: 2,
    });

    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
      // Delete in order respecting foreign key constraints
      await prisma.$transaction([
        prisma.activityChange.deleteMany(),
        prisma.activity.deleteMany(),
        prisma.translation.deleteMany(),
        prisma.translationKey.deleteMany(),
        prisma.environment.deleteMany(),
        prisma.branch.deleteMany(),
        prisma.space.deleteMany(),
        prisma.projectMember.deleteMany(),
        prisma.project.deleteMany(),
        prisma.apiKey.deleteMany(),
        prisma.user.deleteMany(),
      ]);
      console.log('✅ Database cleaned');
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  } catch (error) {
    // Tables might not exist yet on first run
    console.log('ℹ️  Could not clean database (tables may not exist yet)');
  }
}

/**
 * Global setup - runs once before all tests
 */
export async function setup(): Promise<void> {
  console.log('\n🚀 Setting up test environment...\n');

  verifyTestEnvironment();
  await applyMigrations();
  await cleanDatabase();
  await cleanRedis();

  console.log('\n✨ Test setup complete!\n');
}

/**
 * Global teardown - runs once after all tests
 */
export async function teardown(): Promise<void> {
  console.log('\n🧹 Tearing down test environment...\n');

  await cleanDatabase();
  await cleanRedis();

  console.log('✅ Test teardown complete\n');
}
