# ADR-0005: Activity Tracking System

## Status

Proposed

## Date

2025-12-30

## Context

Lingx requires an activity tracking system to record user actions across the platform. This enables:

1. **Audit trail**: Track who made what changes and when
2. **Activity feed**: Display recent project activity to team members
3. **Collaboration visibility**: Help teams understand translation progress

### Activities to Track

#### Project Activities

| Activity Type | Description | Groupable | Example |
|---------------|-------------|-----------|---------|
| `translation` | Translation value updates | ✅ Yes | "Updated 50 translations in en, de" |
| `key_add` | New translation key creation | ✅ Yes | "Added 12 keys" |
| `key_delete` | Translation key deletion | ✅ Yes | "Deleted 3 keys" |
| `branch_create` | Branch creation | ❌ No | "Created branch `feature-x` from `main`" |
| `branch_delete` | Branch deletion | ❌ No | "Deleted branch `old-feature`" |
| `merge` | Branch merge operation | ❌ No | "Merged `feature-x` into `main`" |
| `import` | Translation import | ❌ No | "Imported 150 keys from `messages.json`" |
| `export` | Translation export | ❌ No | "Exported `production` to JSON" |
| `project_settings` | Project settings changed | ❌ No | "Updated project settings" |
| `environment_create` | Environment created | ❌ No | "Created environment `staging`" |
| `environment_delete` | Environment deleted | ❌ No | "Deleted environment `old-staging`" |
| `environment_switch_branch` | Environment branch changed | ❌ No | "Switched `production` to branch `release-v2`" |
| `ai_translate` | AI-powered batch translation | ❌ No | "AI translated 200 keys to German" |

#### User Personal Activities (Future)

| Activity Type | Description | Scope |
|---------------|-------------|-------|
| `api_key_create` | Personal API key created | User |
| `api_key_revoke` | Personal API key revoked | User |
| `member_add` | Member added to project | Project |
| `member_remove` | Member removed from project | Project |

**Note**: `key_update` (rename, description, tags) is tracked as `key_delete` + `key_add`.

### User-Confirmed Requirements

1. **Retention Policy**: Configurable per-project (projects can define their own retention period)
2. **Logging Granularity**: Log every change with sequential session-based grouping
   - Groupable activities (translation, key_add, key_delete) are merged when consecutive
   - Group breaks when: (a) activity type changes, or (b) 15-minute inactivity gap
   - Balances feed density vs. granularity (not too cluttered, not too sparse)

**Sequential Grouping Example:**
```
Timeline for User A:
──────────────────────────────────────────────────────────────────────────────
10:00   10:05   10:08   10:10   10:12      10:35   10:36
[trans] [trans] [trans] [branch] [trans]   [trans] [trans]
└────── Group 1 ──────┘          └─ G2 ─┘  └─── Group 3 ───┘
  "Updated 3 translations"     "Updated 1"   "Updated 2"
                      └─────┘              ↑
                   Not grouped        15+ min gap
                "Created branch X"    = new group
```

### Technical Context

- **Existing Stack**: Fastify 5, Prisma 7, PostgreSQL (per ADR-0004)
- **Related Models**: User, Project, Branch, TranslationKey, Translation (per Prisma schema)
- **Scale Expectations**: 100+ concurrent users, 10,000+ keys per branch

## Key Decisions

This ADR addresses five interconnected design decisions:

1. **Background Job Infrastructure**: Foundation for async processing across the platform
2. **Activity Storage Pattern**: How to structure and store activity data
3. **Grouping Implementation**: How to implement 30-second time-based grouping
4. **Logging Timing**: Synchronous vs asynchronous activity logging
5. **Retention Implementation**: How to enforce per-project retention policies

---

## Decision 1: Background Job Infrastructure

### Decision

Adopt **BullMQ + Redis** as the background job infrastructure.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Use BullMQ for job queues and Redis for both job storage and application caching |
| **Why now** | Background jobs are foundational infrastructure affecting all async processing patterns |
| **Why this** | Redis serves dual purpose (jobs + cache), BullMQ is battle-tested with excellent ecosystem |
| **Known unknowns** | Redis memory sizing for job + cache workloads; optimal queue configuration |
| **Kill criteria** | If Redis operational overhead becomes problematic, consider managed Redis (Upstash, AWS ElastiCache) |

### Options Considered

#### Option A: BullMQ + Redis (Selected)

**Description**: Use BullMQ for job queue management with Redis as the backend. Redis also serves as application cache for environments, API responses, and other cacheable data.

**Pros**:
- Battle-tested, widely adopted in Node.js ecosystem
- Excellent tooling (Bull Board UI for monitoring)
- Redis serves dual purpose: job queues + application cache
- Rich feature set: retries, delays, priorities, rate limiting
- Strong TypeScript support
- Large community and extensive documentation

**Cons**:
- Additional infrastructure (Redis)
- Redis requires memory management
- Another system to monitor and maintain

**Effort**: 2-3 days for initial setup

#### Option B: pg-boss (PostgreSQL-only)

**Description**: Use pg-boss which stores jobs in PostgreSQL, eliminating need for Redis.

**Pros**:
- No additional infrastructure beyond PostgreSQL
- ACID guarantees for job storage
- Simpler deployment

**Cons**:
- Less performant than Redis for high-throughput queues
- Smaller ecosystem and community
- Would still need Redis or another solution for caching
- Less feature-rich than BullMQ

**Effort**: 2 days for initial setup

#### Option C: Trigger.dev

**Description**: Use Trigger.dev as a managed background job service.

**Pros**:
- Managed infrastructure
- Great developer experience
- Built for long-running jobs (AI workloads)
- No operational overhead

**Cons**:
- External vendor dependency
- Cost at scale
- Less control over infrastructure
- Still need Redis for caching

**Effort**: 1-2 days for initial setup

### Redis Usage Strategy

| Use Case | Redis Feature | Example |
|----------|---------------|---------|
| Job Queues | BullMQ queues | Activity batching, email sending, AI translation |
| Scheduled Jobs | BullMQ repeatable | Retention cleanup, daily reports |
| Environment Cache | Key-value + TTL | Cached environment configs for SDK |
| Rate Limiting | Sorted sets | API rate limiting per key |
| Session Cache | Key-value + TTL | Optional session storage |

### Comparison

| Evaluation Axis | BullMQ + Redis | pg-boss | Trigger.dev |
|-----------------|----------------|---------|-------------|
| Performance | Excellent | Good | Excellent |
| Caching Support | Native | None (need separate) | None |
| Operational Complexity | Medium | Low | None (managed) |
| Cost | Infrastructure only | Infrastructure only | Per-job pricing |
| Ecosystem | Excellent | Good | Growing |
| Long-running Jobs | Good | Good | Excellent |

---

## Decision 2: Activity Storage Pattern

### Decision

Adopt **Single Unified Activity Table** as the storage pattern.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Store all activity types in a single `Activity` table with a `type` discriminator and flexible `metadata` JSONB column |
| **Why now** | Storage pattern affects schema design, query patterns, and integration with all feature APIs |
| **Why this** | Simple implementation, excellent query performance for feed display, flexible enough for all activity types |
| **Known unknowns** | JSONB query performance at scale; optimal index strategy for metadata queries |
| **Kill criteria** | If JSONB queries become a bottleneck (>100ms for activity feed), migrate to typed columns |

### Options Considered

#### Option A: Single Unified Activity Table (Selected)

**Description**: One `Activity` table with a `type` enum and `metadata` JSONB column for type-specific data.

```
Activity
├── id: String (cuid)
├── projectId: String (FK)
├── branchId: String? (FK, optional)
├── userId: String (FK)
├── type: ActivityType (enum)
├── metadata: Json (type-specific data)
├── count: Int (for grouped activities)
├── createdAt: DateTime
└── groupKey: String (for grouping)
```

**Pros**:
- Simple schema, single table for all queries
- Excellent read performance for activity feeds (no joins)
- Flexible metadata supports any activity type
- Easy to add new activity types without schema changes
- PostgreSQL JSONB provides efficient indexing and querying
- Recommended pattern in database design literature for audit logging

**Cons**:
- No compile-time type safety for metadata
- JSONB queries slightly slower than typed columns
- Metadata schema must be documented, not enforced by database

**Effort**: 2-3 days implementation

#### Option B: Event Sourcing Pattern

**Description**: Store all state changes as immutable events. Current state is derived by replaying events.

```
Event
├── id: String (cuid)
├── streamId: String (aggregate root ID)
├── type: String (event type)
├── version: Int (sequence number)
├── data: Json (event payload)
├── metadata: Json (user, timestamp, correlation)
├── createdAt: DateTime
```

**Pros**:
- Complete audit trail with full history reconstruction
- Supports temporal queries ("what was the state at time X?")
- Natural fit for complex business domains
- Enables event-driven architecture
- Perfect for compliance-heavy environments

**Cons**:
- Significant complexity increase (event store, projections, snapshots)
- Requires CQRS pattern for efficient reads
- Eventually consistent reads require careful handling
- Overkill for simple activity tracking
- Learning curve for team
- Difficult to retrofit or migrate away from

**Effort**: 10-15 days implementation

#### Option C: Per-Entity History Tables

**Description**: Create separate history tables for each entity (TranslationKeyHistory, TranslationHistory, etc.).

```
TranslationKeyHistory
├── id: String
├── keyId: String (FK)
├── operation: enum (CREATE, UPDATE, DELETE)
├── previousValue: Json
├── newValue: Json
├── userId: String
├── createdAt: DateTime

TranslationHistory (similar structure)
BranchHistory (similar structure)
```

**Pros**:
- Type-safe schemas for each entity
- Clear separation of concerns
- Easy to query history for specific entity

**Cons**:
- Multiple tables to query for unified activity feed
- Schema explosion (one history table per entity)
- Complex queries to aggregate across entity types
- Difficult to maintain consistency across tables
- Adding new tracked entities requires new tables

**Effort**: 5-7 days implementation

#### Option D: Hybrid (Activity Table + Entity Audit Triggers)

**Description**: Single Activity table for display, plus database triggers for detailed audit logging.

**Pros**:
- Best of both worlds (simple feed + detailed audit)
- Database-level guarantees for audit completeness
- Activity table optimized for reads

**Cons**:
- Two systems to maintain
- Trigger-based auditing adds database complexity
- Potential consistency issues between systems
- More difficult to test

**Effort**: 6-8 days implementation

### Comparison

| Evaluation Axis | Single Table | Event Sourcing | Per-Entity | Hybrid |
|-----------------|--------------|----------------|------------|--------|
| Implementation Complexity | Low | Very High | Medium | High |
| Query Performance (Feed) | Excellent | Good | Poor | Excellent |
| Type Safety | Medium | Medium | High | Medium |
| Flexibility | High | Very High | Low | High |
| Audit Completeness | Good | Excellent | Good | Excellent |
| MVP Timeline Risk | Low | High | Medium | Medium |
| Future Scalability | Good | Excellent | Medium | Good |

---

## Decision 3: Grouping Implementation

### Decision

Adopt **Write-Through Queue with Batch Processor** for time-based grouping.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Publish activity events to BullMQ queue; batch processor aggregates by 30-second windows and writes to database |
| **Why now** | Grouping strategy affects write patterns, API design, and query performance |
| **Why this** | Leverages BullMQ infrastructure (Decision 1), excellent write performance, handles burst traffic |
| **Known unknowns** | Optimal batch interval (5s vs 10s); queue memory usage under load |
| **Kill criteria** | If batch processing delay >30s consistently, increase worker concurrency |

### Options Considered

#### Option A: Application-Level Batching with Group Key

**Description**: Generate a unique `groupKey` combining user, project, activity type, and 30-second time bucket. Use PostgreSQL `ON CONFLICT DO UPDATE` to increment count and merge metadata.

```typescript
// Group key generation
const timeWindow = Math.floor(Date.now() / 30000); // 30-second bucket
const groupKey = `${userId}:${projectId}:${type}:${timeWindow}`;

// Upsert logic
await prisma.activity.upsert({
  where: { groupKey },
  create: { groupKey, userId, projectId, type, count: 1, metadata },
  update: {
    count: { increment: 1 },
    metadata: mergeMetadata(existing, new)
  }
});
```

**Pros**:
- Simple, synchronous implementation
- Atomic updates via PostgreSQL upsert
- Natural grouping without post-processing
- Group key enables easy deduplication

**Cons**:
- Potential contention on hot group keys
- 30-second boundary may split related activities
- Metadata merging logic must handle all types
- Adds latency to request path

**Effort**: 2-3 days implementation

#### Option B: Write-Through Queue with Sequential Grouping (Selected)

**Description**: Publish activity events to BullMQ queue. Background worker processes jobs with sequential session-based grouping: consecutive same-type activities are merged until type changes or 15-minute gap occurs.

```typescript
// API Handler - fast, non-blocking
await updateTranslation(...);
await activityQueue.add('log', {
  userId, projectId, branchId, type: 'translation', metadata,
  timestamp: Date.now()
});
return success; // Immediate response (~1-2ms queue publish)

// Background Worker - sequential grouping logic
const SESSION_GAP_MS = 15 * 60 * 1000; // 15 minutes
const GROUPABLE_TYPES = ['translation', 'key_add', 'key_delete'];

const worker = new Worker('activity', async () => {
  const jobs = await collectPendingJobs(); // sorted by timestamp

  // Sequential grouping: merge consecutive same-type activities
  const activities = jobs.reduce((result, job) => {
    const last = result[result.length - 1];

    const canGroup = last &&
      GROUPABLE_TYPES.includes(job.type) &&
      last.userId === job.userId &&
      last.projectId === job.projectId &&
      last.type === job.type &&
      job.timestamp - last.lastTimestamp < SESSION_GAP_MS;

    if (canGroup) {
      // Extend existing group
      last.count++;
      last.lastTimestamp = job.timestamp;
      mergeMetadata(last.metadata, job.metadata);
    } else {
      // Start new activity (grouped or single)
      result.push({
        ...job,
        count: 1,
        lastTimestamp: job.timestamp,
        groupKey: generateGroupKey(job)
      });
    }

    return result;
  }, []);

  // Batch upsert
  await prisma.$transaction(
    activities.map(a => prisma.activity.upsert({
      where: { groupKey: a.groupKey },
      create: a,
      update: { count: { increment: a.count }, metadata: a.metadata }
    }))
  );
});
```

**Pros**:
- Excellent write performance (async, ~1-2ms from request path)
- Sequential grouping respects natural work sessions
- Type changes break groups immediately (intuitive feed)
- 15-minute window balances density vs. granularity
- Leverages existing BullMQ infrastructure (Decision 1)
- Reliable delivery with Redis persistence

**Cons**:
- Eventual consistency (activities delayed until worker runs)
- Sequential grouping requires ordered processing
- Queue must be monitored for backlog

**Effort**: 4-5 days implementation

#### Option C: Database-Level Aggregation (Materialized View)

**Description**: Log every individual activity, use PostgreSQL materialized view to aggregate for display.

```sql
CREATE MATERIALIZED VIEW activity_feed AS
SELECT
  user_id, project_id, type,
  date_trunc('30 seconds', created_at) as window,
  count(*) as count,
  jsonb_agg(metadata) as details
FROM activity_log
GROUP BY user_id, project_id, type, window;
```

**Pros**:
- Complete raw data preserved
- Flexible aggregation (can change grouping)
- No application-level logic for grouping
- Can rebuild view with different parameters

**Cons**:
- Materialized view refresh has cost
- Storage of both raw and aggregated data
- Refresh timing affects data freshness
- Complex schema management

**Effort**: 3-4 days implementation

#### Option D: Client-Side Aggregation

**Description**: Store individual activities, aggregate in application layer or frontend when displaying.

**Pros**:
- Simplest storage (just log everything)
- Maximum flexibility in display
- Can change grouping without data migration

**Cons**:
- Poor read performance for feeds
- Heavy computation on every request
- Memory usage for large result sets
- Inconsistent grouping if logic changes

**Effort**: 1-2 days implementation (but ongoing performance cost)

### Comparison

| Evaluation Axis | App-Level Batch | Queue + Processor | Materialized View | Client-Side |
|-----------------|-----------------|-------------------|-------------------|-------------|
| Write Performance | Good | Excellent | Good | Excellent |
| Read Performance | Excellent | Excellent | Good | Poor |
| Data Freshness | Immediate | 5-10s delay | Configurable | Immediate |
| Infrastructure | None | Redis | None | None |
| Implementation | Simple | Complex | Medium | Simple |
| MVP Risk | Low | Medium | Low | Low |

---

## Decision 4: Logging Timing

### Decision

Adopt **Message Queue (Async Processing)** for activity logging.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Publish activity events to BullMQ immediately after main operation; worker processes asynchronously |
| **Why now** | Timing strategy affects user experience, data consistency, and error handling |
| **Why this** | Keeps request path fast, leverages BullMQ infrastructure (Decision 1), reliable delivery with retries |
| **Known unknowns** | Acceptable delay threshold for activity visibility; queue publish latency under load |
| **Kill criteria** | If queue publish adds >10ms to P95 response time, investigate Redis connection pooling |

### Options Considered

#### Option A: Synchronous Logging

**Description**: Log activity as part of the request handling, either in the same transaction or immediately after the main operation.

```typescript
// Same transaction approach
await prisma.$transaction([
  prisma.translation.update({ ... }),
  prisma.activity.upsert({ ... })
]);

// Sequential approach with timeout
await updateTranslation(...);
await Promise.race([
  logActivity(...),
  timeout(100) // 100ms max
]);
```

**Pros**:
- Guaranteed consistency (activity logged when operation succeeds)
- Simple error handling
- User sees accurate activity immediately
- Debugging is straightforward

**Cons**:
- Adds latency to every tracked operation (+10-50ms)
- Activity logging failure could affect main operation (if in transaction)
- Database load increases with every operation
- Heavy operations in request context (undesirable)

**Effort**: 1-2 days implementation

#### Option B: Fire-and-Forget Async

**Description**: Return success to user immediately, log activity asynchronously without waiting.

```typescript
await updateTranslation(...);
// Don't await - fire and forget
logActivity(...).catch(err => logger.error('Activity logging failed', err));
return success;
```

**Pros**:
- No impact on response latency
- Main operation unaffected by logging failures
- Simple implementation

**Cons**:
- Activities may be lost on errors (no retry)
- No guarantee activity is logged when user sees success
- Difficult to debug missing activities
- Race conditions possible

**Effort**: 1 day implementation

#### Option C: Message Queue via BullMQ (Selected)

**Description**: Publish activity event to BullMQ queue, worker processes and persists with batching (see Decision 3).

```typescript
// API Handler - minimal latency impact (~1-2ms)
await updateTranslation(...);
await activityQueue.add('log', {
  userId, projectId, branchId, type: 'translation', metadata,
  timestamp: Date.now()
});
return success;

// Worker handles batching and persistence (Decision 3)
```

**Pros**:
- Minimal latency impact (~1-2ms for queue publish)
- Fully decoupled from main request
- Reliable delivery with Redis persistence
- Automatic retries with exponential backoff
- Leverages existing BullMQ infrastructure (Decision 1)
- Can handle burst traffic via worker scaling
- Consistent with platform architecture (no heavy ops in request)

**Cons**:
- Eventual consistency (5-10 second delay acceptable)
- More complex than synchronous
- Requires queue monitoring

**Effort**: Included in Decision 3 implementation

#### Option D: Background Job Scheduler

**Description**: Record activity intent in fast storage (Redis), batch process via scheduled job.

**Pros**:
- Very fast writes
- Efficient batching
- Can retry failed batches

**Cons**:
- Delayed visibility (seconds to minutes)
- Additional infrastructure
- Complex failure recovery

**Effort**: 3-4 days implementation

### Comparison

| Evaluation Axis | Synchronous | Fire-and-Forget | BullMQ Queue | Background Job |
|-----------------|-------------|-----------------|--------------|----------------|
| Latency Impact | +10-50ms | None | +1-2ms | None |
| Data Consistency | Guaranteed | Best-effort | Guaranteed | Guaranteed |
| Infrastructure | None | None | Redis (shared) | Redis + Cron |
| Failure Recovery | Automatic | None | Retry | Retry |
| Architecture Fit | Poor | Poor | Excellent | Good |

---

## Decision 5: Retention Implementation

### Decision

Adopt **Background Job Cleanup with Project Configuration** for retention enforcement, using BullMQ scheduled jobs.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Store retention period in Project model; run nightly cleanup via BullMQ repeatable job |
| **Why now** | Retention strategy affects storage costs and compliance requirements |
| **Why this** | Leverages BullMQ infrastructure (Decision 1); simple, efficient batch deletes; per-project config |
| **Known unknowns** | Optimal batch size for deletes; impact on database during cleanup |
| **Kill criteria** | If cleanup job takes >30 minutes or causes noticeable performance degradation |

### Options Considered

#### Option A: Background Job Cleanup via BullMQ (Selected)

**Description**: Add `activityRetentionDays` to Project model. BullMQ repeatable job runs nightly to delete expired activities.

```typescript
// Project model addition
model Project {
  // ... existing fields
  activityRetentionDays Int @default(90)
}

// Register repeatable job (on app startup)
await retentionQueue.add(
  'cleanup',
  {},
  {
    repeat: { pattern: '0 3 * * *' }, // Daily at 3 AM
    jobId: 'activity-retention-cleanup'
  }
);

// Worker implementation
const retentionWorker = new Worker('retention', async () => {
  const projects = await prisma.project.findMany({
    select: { id: true, activityRetentionDays: true }
  });

  for (const project of projects) {
    const cutoff = subDays(new Date(), project.activityRetentionDays);
    // Delete in batches of 1000 to avoid long locks
    let deleted = 0;
    do {
      const result = await prisma.activity.deleteMany({
        where: {
          projectId: project.id,
          createdAt: { lt: cutoff }
        },
        take: 1000
      });
      deleted = result.count;
    } while (deleted === 1000);
  }
});
```

**Pros**:
- Leverages existing BullMQ infrastructure (Decision 1)
- Configurable per-project
- Efficient batch deletes with chunking
- No impact on read/write paths
- Built-in monitoring via Bull Board
- Automatic retry on failure

**Cons**:
- Delayed cleanup (up to 24 hours)
- Large deletes may still impact database

**Effort**: 1 day implementation (infrastructure already exists)

#### Option B: On-Read Cleanup (Lazy Deletion)

**Description**: Check retention on every read, delete expired records before returning results.

```typescript
async function getActivities(projectId: string) {
  const project = await getProject(projectId);
  const cutoff = subDays(new Date(), project.activityRetentionDays);

  // Delete expired in background
  prisma.activity.deleteMany({
    where: { projectId, createdAt: { lt: cutoff } }
  }).catch(log);

  // Return current activities
  return prisma.activity.findMany({
    where: { projectId, createdAt: { gte: cutoff } }
  });
}
```

**Pros**:
- No separate job infrastructure
- Self-cleaning on access
- Always returns fresh data

**Cons**:
- Adds latency to read operations
- Unused projects never get cleaned
- Unpredictable cleanup timing
- May cause timeouts on large deletes

**Effort**: 1 day implementation

#### Option C: PostgreSQL Partitioning with Drop

**Description**: Partition Activity table by month, drop old partitions per retention policy.

```sql
CREATE TABLE activity (
  ...
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE activity_2025_01 PARTITION OF activity
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Cleanup: DROP PARTITION (instant)
DROP TABLE activity_2024_10;
```

**Pros**:
- Instant deletion (DROP vs DELETE)
- Excellent for large scale
- Native PostgreSQL feature
- Efficient queries on time ranges

**Cons**:
- Fixed partition granularity (not per-project)
- Complex schema management
- Partition maintenance overhead
- Requires PostgreSQL expertise

**Effort**: 3-4 days implementation

#### Option D: Soft Delete with Archival

**Description**: Mark records as deleted, move to archive table periodically.

```typescript
model Activity {
  // ... existing fields
  deletedAt DateTime?
}

model ActivityArchive {
  // Same structure as Activity
}
```

**Pros**:
- Recoverable deletes
- Historical data preserved
- Audit compliance friendly

**Cons**:
- Double storage
- Complex queries (filter deleted)
- Archive management overhead
- Overkill for activity logs

**Effort**: 3-4 days implementation

### Comparison

| Evaluation Axis | Background Job | On-Read | Partitioning | Soft Delete |
|-----------------|----------------|---------|--------------|-------------|
| Deletion Speed | Batch (fast) | Inline (slow) | Instant | N/A |
| Read Performance | No impact | Degraded | Improved | Slightly degraded |
| Per-Project Config | Yes | Yes | No | Yes |
| Infrastructure | BullMQ (shared) | None | DBA needed | None |
| Storage Efficiency | Good | Good | Excellent | Poor |
| MVP Simplicity | High | High | Low | Medium |

---

## Final Decisions Summary

| Decision | Selected Option | Key Rationale |
|----------|-----------------|---------------|
| Background Infrastructure | BullMQ + Redis | Battle-tested, dual-purpose (jobs + cache) |
| Storage Pattern | Single Unified Activity Table | Simple, performant, flexible |
| Grouping Implementation | Sequential Session-Based Grouping | 15-min sessions, type-change breaks |
| Logging Timing | Async via BullMQ | No heavy ops in request, reliable delivery |
| Retention Implementation | Background Job Cleanup | Configurable, efficient batch operations |

## Proposed Schema

```prisma
enum ActivityType {
  // Groupable (sequential session-based)
  translation
  key_add
  key_delete

  // Non-groupable (single events)
  branch_create
  branch_delete
  merge
  import
  export
  project_settings
  environment_create
  environment_delete
  environment_switch_branch
  ai_translate

  // User personal (future)
  // api_key_create
  // api_key_revoke
  // member_add
  // member_remove
}

// Grouped activity (displayed in feed)
model Activity {
  id        String       @id @default(cuid())
  projectId String
  branchId  String?      // Optional, not all activities are branch-specific
  userId    String
  type      ActivityType
  metadata  Json         // Summary + first 10 changes preview (for hover)
  count     Int          @default(1) // For grouped activities
  groupKey  String       @unique // Enables upsert for grouping
  createdAt DateTime     @default(now())

  project Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  branch  Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)

  // Full audit trail
  changes ActivityChange[]

  @@index([projectId, createdAt(sort: Desc)])
  @@index([userId])
  @@index([type])
  @@index([branchId])
}

// Individual changes (full audit trail for "View all" link)
model ActivityChange {
  id         String   @id @default(cuid())
  activityId String

  // What changed
  entityType String   // 'translation', 'key', etc.
  entityId   String   // keyId, translationId, etc.
  keyName    String?  // Denormalized for display without joins
  language   String?  // For translation changes

  // Change details (old → new)
  oldValue   String?  // null for creates
  newValue   String?  // null for deletes

  createdAt  DateTime @default(now())

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@index([activityId])
  @@index([entityId])  // Query: "Who changed this key?"
  @@index([createdAt])
}

// Addition to existing Project model
model Project {
  // ... existing fields
  activityRetentionDays Int @default(90)

  activities Activity[]
}
```

## Metadata Schema by Activity Type

**Design Principle**: Store structured data, render messages with i18n on frontend.

```typescript
// Frontend renders with i18n (example)
t('activity.translation', { count: 50, languages: formatList(['en', 'de']) })
// EN: "Updated 50 translations in English, German"
// DE: "50 Übersetzungen in Englisch, Deutsch aktualisiert"
```

### Groupable Types (with preview)

```typescript
// Common structure for groupable activities
type GroupableMetadata = {
  // Summary for i18n rendering
  languages?: string[];  // For translation type

  // Preview for hover (first 10 changes)
  preview: Array<{
    keyId: string;
    keyName: string;
    language?: string;
    oldValue?: string;  // Truncated to ~100 chars
    newValue?: string;  // Truncated to ~100 chars
  }>;

  // Overflow indicator
  hasMore: boolean;  // true if > 10 changes (triggers "View all" link)
};

type TranslationMetadata = GroupableMetadata & {
  languages: string[];  // ['en', 'de', 'fr']
};

type KeyAddMetadata = GroupableMetadata;

type KeyDeleteMetadata = GroupableMetadata;

// Non-groupable types (single event metadata)
type BranchCreateMetadata = {
  branchId: string;
  branchName: string;
  sourceBranchId?: string;
  sourceBranchName?: string;
};

type BranchDeleteMetadata = {
  branchId: string;
  branchName: string;
};

type MergeMetadata = {
  sourceBranchId: string;
  sourceBranchName: string;
  targetBranchId: string;
  targetBranchName: string;
  conflictsResolved?: number;
};

type ImportMetadata = {
  fileName: string;
  keyCount: number;
  languages: string[];
};

type ExportMetadata = {
  format: string;
  languages: string[];
  keyCount: number;
  environmentName?: string;
};

type ProjectSettingsMetadata = {
  changedFields: string[]; // e.g., ['name', 'defaultLanguage']
};

type EnvironmentCreateMetadata = {
  environmentId: string;
  environmentName: string;
  branchId: string;
  branchName: string;
};

type EnvironmentDeleteMetadata = {
  environmentId: string;
  environmentName: string;
};

type EnvironmentSwitchBranchMetadata = {
  environmentId: string;
  environmentName: string;
  oldBranchId: string;
  oldBranchName: string;
  newBranchId: string;
  newBranchName: string;
};

type AiTranslateMetadata = {
  keyCount: number;
  sourceLanguage: string;
  targetLanguages: string[];
  provider?: string; // e.g., 'openai', 'anthropic'
};
```

## Consequences

### Positive Consequences

- **Fast request path**: Activity logging adds only ~1-2ms (queue publish) to requests
- **No heavy operations in request context**: All database writes happen in background workers
- **Excellent read performance**: Activity feed queries are direct table scans with index
- **Flexible metadata**: JSONB supports any activity type without schema changes
- **Per-project configuration**: Retention is configurable without global constraints
- **Reliable delivery**: BullMQ provides automatic retries with exponential backoff
- **Unified infrastructure**: Redis serves both job queues and application caching
- **Built-in monitoring**: Bull Board provides visibility into queue health and job status
- **Scalable**: Can add worker instances to handle increased load
- **Future-ready**: Same infrastructure supports email, AI translation, exports
- **Full audit trail**: ActivityChange table enables "View all changes" for compliance
- **Interactive UI**: Hover preview (10 changes) + full details on click
- **i18n-ready**: Structured metadata enables localized activity messages

### Negative Consequences

- **Additional infrastructure**: Requires Redis alongside PostgreSQL
- **Eventual consistency**: Activities appear with 5-10 second delay
- **Storage overhead**: ActivityChange table stores all individual changes (mitigated by retention policy)
- **Grouping boundary effects**: Activities spanning 15-minute sessions may be split
- **Operational complexity**: Must monitor Redis and worker health
- **JSONB query limitations**: Complex metadata queries may require additional indexes

### Neutral Consequences

- **Standard patterns**: BullMQ is widely adopted in Node.js ecosystem
- **Prisma compatibility**: All features are supported by Prisma 7
- **Redis learning curve**: Team may need Redis operational knowledge

## Implementation Guidance

### Activity Service Interface

```typescript
interface ActivityService {
  // Queue an activity for async processing (~1-2ms)
  log(params: {
    projectId: string;
    branchId?: string;
    userId: string;
    type: ActivityType;
    changes: ChangeDetail[];  // Individual changes for audit trail
  }): Promise<void>;

  // Get activity feed for project (includes preview in metadata)
  getProjectFeed(projectId: string, options?: {
    limit?: number;
    cursor?: string;
    types?: ActivityType[];
  }): Promise<PaginatedActivities>;

  // Get activity feed for user across projects
  getUserFeed(userId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedActivities>;

  // Get full audit details for an activity ("View all" link)
  getActivityChanges(activityId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedChanges>;
}

type ChangeDetail = {
  entityType: string;
  entityId: string;
  keyName?: string;
  language?: string;
  oldValue?: string;
  newValue?: string;
};
```

### API Endpoints

```typescript
// Activity feed (fast, uses metadata.preview for hover)
GET /api/projects/:projectId/activity
GET /api/projects/:projectId/activity?types=translation,key_add
→ Returns Activity[] with metadata.preview (first 10 changes)

// Full audit details (paginated, for "View all" modal)
GET /api/activity/:activityId/changes?limit=50&cursor=xxx
→ Returns ActivityChange[] for full audit trail

// User's activity across all projects
GET /api/users/me/activity
→ Returns Activity[] for current user
```

### i18n Translation Keys

Activity messages are rendered on frontend using structured metadata:

```typescript
// Translation keys (add to your i18n files)
const activityKeys = {
  // Groupable types
  'activity.translation': 'Updated {{count}} translations in {{languages}}',
  'activity.key_add': 'Added {{count}} keys',
  'activity.key_delete': 'Deleted {{count}} keys',

  // Non-groupable types
  'activity.branch_create': 'Created branch {{branchName}} from {{sourceBranchName}}',
  'activity.branch_delete': 'Deleted branch {{branchName}}',
  'activity.merge': 'Merged {{sourceBranchName}} into {{targetBranchName}}',
  'activity.import': 'Imported {{keyCount}} keys from {{fileName}}',
  'activity.export': 'Exported {{keyCount}} keys to {{format}}',
  'activity.project_settings': 'Updated project settings',
  'activity.environment_create': 'Created environment {{environmentName}}',
  'activity.environment_delete': 'Deleted environment {{environmentName}}',
  'activity.environment_switch_branch': 'Switched {{environmentName}} to {{newBranchName}}',
  'activity.ai_translate': 'AI translated {{keyCount}} keys to {{languages}}',

  // Overflow indicator
  'activity.and_more': '... and {{count}} more',
};

// Frontend rendering example
function renderActivity(activity: Activity) {
  const { type, count, metadata } = activity;

  return t(`activity.${type}`, {
    count,
    languages: formatLanguageList(metadata.languages),
    branchName: metadata.branchName,
    // ... other interpolations based on type
  });
}
```

### Group Key Generation

```typescript
function generateGroupKey(
  userId: string,
  projectId: string,
  type: ActivityType,
  timestamp: Date = new Date()
): string {
  const windowSeconds = 30;
  const timeWindow = Math.floor(timestamp.getTime() / (windowSeconds * 1000));
  return `${userId}:${projectId}:${type}:${timeWindow}`;
}
```

### Retention Cleanup Job

- Schedule to run daily during low-traffic hours
- Process projects in batches of 10
- Delete in batches of 1000 records to avoid long locks
- Log cleanup statistics for monitoring

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Activity Tracking System                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     REQUEST PATH (Fast, ~1-2ms)                        │ │
│  │                                                                         │ │
│  │  API Handler                                                            │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐   │ │
│  │  │ Execute main    │───▶│ activityQueue   │───▶│ Return response  │   │ │
│  │  │ operation       │    │ .add('log', {   │    │ to client        │   │ │
│  │  │                 │    │   changes: [...] │    │                  │   │ │
│  │  │                 │    │ })              │    │                  │   │ │
│  │  └─────────────────┘    └─────────────────┘    └──────────────────┘   │ │
│  └────────────────────────────┼──────────────────────────────────────────┘ │
│                               │                                            │
│                               ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         REDIS (BullMQ)                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ activity:queue   │ Jobs with full change details               │   │ │
│  │  ├─────────────────────────────────────────────────────────────────┤   │ │
│  │  │ retention:queue  │ Repeatable: cleanup @ 0 3 * * *             │   │ │
│  │  ├─────────────────────────────────────────────────────────────────┤   │ │
│  │  │ cache:env:*      │ Environment configs (TTL)                   │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                               │                                            │
│                               ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    BACKGROUND WORKERS (BullMQ)                          │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Activity Processor                                             │   │ │
│  │  │  1. Collect pending jobs (sorted by timestamp)                  │   │ │
│  │  │  2. Sequential grouping (same type + <15min gap = merge)        │   │ │
│  │  │  3. For each group:                                             │   │ │
│  │  │     - Upsert Activity (summary + first 10 changes preview)      │   │ │
│  │  │     - Insert ALL ActivityChange records (full audit)            │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Retention Cleanup (daily @ 3 AM)                               │   │ │
│  │  │  DELETE Activity + CASCADE to ActivityChange                    │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Future Workers: Email, AI Translation, Export, etc.           │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                               │                                            │
│                               ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        PostgreSQL                                       │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Activity (grouped, for feed display)                            │   │ │
│  │  │ id | projectId | userId | type | count | metadata | groupKey    │   │ │
│  │  │                                                                 │   │ │
│  │  │ metadata.preview = first 10 changes (for hover)                 │   │ │
│  │  │ metadata.hasMore = true if > 10 changes                         │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                               │ 1:N                                     │ │
│  │                               ▼                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ ActivityChange (full audit trail, for "View all" link)          │   │ │
│  │  │ id | activityId | entityType | keyName | lang | old → new       │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Example

```
User updates 50 translations over 10 minutes
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  50 Queue Jobs (each with oldValue → newValue)                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ Worker processes
┌─────────────────────────────────────────────────────────────────────────────┐
│  Sequential Grouping: All 50 are same type, same user, <15min gaps          │
│  → Merged into 1 Activity                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐     ┌────────────────────────────────────────┐
│         Activity             │     │        ActivityChange (50 rows)        │
│  type: translation           │     │                                        │
│  count: 50                   │────▶│  checkout.title | EN | "A" → "B"       │
│  metadata.preview: [10]      │     │  checkout.btn   | EN | "X" → "Y"       │
│  metadata.hasMore: true      │     │  ...48 more rows                       │
│  metadata.languages: [en,de] │     │                                        │
└──────────────────────────────┘     └────────────────────────────────────────┘

         │                                       │
         ▼                                       ▼
┌──────────────────────────────┐     ┌────────────────────────────────────────┐
│     Activity Feed (fast)     │     │      "View All" Modal (paginated)      │
│                              │     │                                        │
│  "Updated 50 translations    │     │  Page 1 of 5                           │
│   in English, German"        │     │  ┌──────────────────────────────────┐  │
│                              │     │  │ Key         │ Lang │ Old → New   │  │
│  [Hover: shows 10 preview]   │     │  ├──────────────────────────────────┤  │
│  [Click: opens full audit]   │     │  │ checkout... │ EN   │ "A" → "B"  │  │
│                              │     │  │ ...         │      │            │  │
└──────────────────────────────┘     └────────────────────────────────────────┘
```

## Related Information

- ADR-0001: Monorepo Structure (API location in apps/api)
- ADR-0002: Branch Storage Strategy (Copy-on-Write pattern for branches)
- ADR-0003: Authentication Approach (User context for activities)
- ADR-0004: API Framework Selection (Fastify + Prisma integration)
- Prisma Schema: `/apps/api/prisma/schema.prisma`

## References

### Background Jobs & Queues
- [BullMQ Documentation](https://docs.bullmq.io/) - Official BullMQ documentation
- [BullMQ Best Practices](https://docs.bullmq.io/guide/going-to-production) - Production deployment guide
- [Bull Board](https://github.com/felixmosh/bull-board) - Queue monitoring UI

### Activity Tracking Patterns
- [Database Design for Audit Logging](https://vertabelo.com/blog/database-design-for-audit-logging/) - Single unified table pattern recommendation
- [How to Keep Track of What Users Do](https://vertabelo.com/blog/database-design-how-to-keep-track-of-what-the-users-do/) - Activity tracking database design
- [Activity Feed Design Guide](https://getstream.io/blog/activity-feed-design/) - Activity feed UX patterns
- [Time-Based Grouping Pattern](https://softwarepatternslexicon.com/103/11/1/) - Temporal grouping implementation

### Alternatives Considered
- [Event Sourcing Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) - Event sourcing considerations and trade-offs
- [Event Sourcing - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html) - Original event sourcing pattern

### Database
- [PostgreSQL JSONB Performance](https://www.postgresql.org/docs/current/datatype-json.html) - JSONB indexing and querying
- [Redis Persistence](https://redis.io/docs/management/persistence/) - Redis durability options
