# ADR-0002: Branch Storage Strategy

## Status

Accepted

## Context

Localeflow implements a git-like branching model for translations. When users create a translation branch (e.g., `feature-checkout-redesign`), the system needs to store and manage translation data in a way that supports:

1. **Branch creation**: Creating a new branch from an existing branch
2. **Independent editing**: Modifying translations on a branch without affecting the source
3. **Diff generation**: Comparing two branches to show added/modified/deleted keys
4. **Merge operations**: Combining changes from one branch into another
5. **Conflict detection**: Identifying when the same key was modified on both branches

The core challenge is determining how to store branch data efficiently while enabling these operations. The data model involves:
- Projects containing multiple Spaces
- Spaces containing multiple Branches
- Branches containing TranslationKeys
- TranslationKeys containing Translations (one per language)

Typical usage patterns:
- Projects may have 1,000-10,000 translation keys per space
- Branches are typically short-lived (days to weeks)
- Most branches have relatively few changes compared to `main`
- Merge operations need to complete within seconds

## Decision

Adopt **Copy-on-Write (Full Copy)** as the branch storage strategy for MVP.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | When creating a branch, copy all TranslationKeys and Translations from the source branch to the new branch |
| **Why now** | Branch storage strategy fundamentally affects database schema, API design, and merge algorithms - must be decided before implementation |
| **Why this** | Simpler implementation with predictable performance; storage cost is acceptable for MVP scale (100 projects, 10K keys) |
| **Known unknowns** | Exact storage growth rate with typical branching patterns; performance of bulk copy operation at 10K+ keys |
| **Kill criteria** | If storage costs exceed reasonable limits or branch creation takes >30 seconds for typical projects |

## Rationale

For MVP, the copy-on-write approach prioritizes:
1. **Implementation simplicity**: Standard CRUD operations, no complex delta resolution
2. **Read performance**: Direct queries without joining delta tables
3. **Merge clarity**: Simple comparison of two complete datasets
4. **Debugging ease**: Each branch is self-contained and inspectable

The storage overhead is acceptable for MVP scale and can be optimized later if needed.

### Options Considered

#### 1. Full Copy (Copy-on-Write) (Selected)
**Description**: When creating a branch, duplicate all TranslationKeys and their Translations from the source branch. Each branch has complete, independent data.

```
Branch: main
├── TranslationKey: "checkout.title" → Translations: [en: "Checkout", uk: "Оформлення"]
├── TranslationKey: "checkout.submit" → Translations: [en: "Submit", uk: "Підтвердити"]
└── TranslationKey: "cart.empty" → Translations: [en: "Cart is empty", uk: "Кошик порожній"]

Branch: feature-x (created from main)
├── TranslationKey: "checkout.title" → Translations: [en: "Checkout", uk: "Оформлення"]
├── TranslationKey: "checkout.submit" → Translations: [en: "Pay Now", uk: "Сплатити зараз"]  ← Modified
└── TranslationKey: "cart.empty" → Translations: [en: "Cart is empty", uk: "Кошик порожній"]
```

**Pros**:
- Simple implementation with standard CRUD operations
- Fast read performance (no joins or delta resolution)
- Each branch is self-contained and easy to debug
- Merge algorithm is straightforward comparison
- No risk of orphaned deltas or complex cleanup
- On the read side, ideal as there is no additional data processing needed

**Cons**:
- Higher storage usage (O(n) per branch where n = total translations)
- Branch creation is slower (must copy all data)
- Small or frequent changes still require full data presence
- Database size grows linearly with branch count

**Effort**: 3-5 days implementation

**Storage Estimate**:
- 10,000 keys × 5 languages × 100 bytes average = ~5 MB per branch
- 10 branches = ~50 MB per space
- Acceptable for self-hosted deployment

#### 2. Delta Storage (Merge-on-Read)
**Description**: Store only the differences from the base branch. Branch data = base branch + deltas.

```
Branch: main (base data stored here)
├── TranslationKey: "checkout.title" → [en: "Checkout", uk: "Оформлення"]
├── TranslationKey: "checkout.submit" → [en: "Submit", uk: "Підтвердити"]
└── TranslationKey: "cart.empty" → [en: "Cart is empty", uk: "Кошик порожній"]

Branch: feature-x (only deltas stored)
├── baseBranchId: main
└── Delta: { modified: { "checkout.submit": { en: "Pay Now", uk: "Сплатити зараз" } } }
```

**Pros**:
- Minimal storage overhead (only changes stored)
- Fast branch creation (only metadata created)
- Easy to see exactly what changed on a branch
- Greatly reduces write times for updates and deletes

**Cons**:
- Read operations require delta resolution (join with base)
- Complex merge algorithm when base has changed
- "Diamond problem" with nested branches
- Requires delta compaction/cleanup strategy
- Minor cost to merge the delete files at read time
- Performance degrades with long-lived branches
- Debugging requires reconstructing full state

**Effort**: 7-10 days implementation

#### 3. Git-backed Storage
**Description**: Store translation files in an actual Git repository. Use Git's native branching and merging capabilities.

```
repository/
├── .git/
├── frontend/
│   ├── en.json
│   └── uk.json
└── backend/
    ├── en.json
    └── uk.json
```

**Pros**:
- Leverages battle-tested Git merge algorithms
- Native support for branches, history, and blame
- Familiar model for developers
- Built-in compression and deduplication
- Easy export/import via git clone

**Cons**:
- Requires Git repository management (libgit2 or shell commands)
- File-based operations don't map well to key-level edits
- Merge conflicts are file-level, not key-level
- Additional complexity for the API layer
- Scaling concerns with large repositories
- Concurrent edit conflicts harder to manage

**Effort**: 10-15 days implementation

#### 4. Shallow Clone with Reference
**Description**: New branches reference parent data and only materialize copies when edits occur (true copy-on-write semantics).

```
Branch: main (full data)
├── TranslationKey: "checkout.title" (owned)
├── TranslationKey: "checkout.submit" (owned)
└── TranslationKey: "cart.empty" (owned)

Branch: feature-x
├── baseBranchId: main
├── TranslationKey: "checkout.submit" (copied on first edit, owned)
└── references: ["checkout.title", "cart.empty"] (read from main)
```

**Pros**:
- Branch creation is instant (no data copied)
- Storage efficient for branches with few changes
- Shallow clones are used for short-lived cases like testing

**Cons**:
- Complex read queries (check local, fallback to base)
- Reference management adds complexity
- Deletion handling is tricky (need tombstones)
- Shallow clones reference data files in the source - if source changes, need careful management
- Base branch changes affect child branches unexpectedly
- Merge complexity increases significantly

**Effort**: 8-12 days implementation

## Comparison

| Evaluation Axis | Full Copy | Delta Storage | Git-backed | Shallow Clone |
|-----------------|-----------|---------------|------------|---------------|
| Implementation Complexity | Low | High | Very High | High |
| Read Performance | Excellent | Good | Good | Good |
| Write Performance | Good | Excellent | Moderate | Excellent |
| Storage Efficiency | Low | Excellent | Excellent | Good |
| Branch Creation Speed | Moderate | Instant | Fast | Instant |
| Merge Algorithm Complexity | Low | High | Low (Git) | High |
| Debugging Ease | Excellent | Poor | Moderate | Moderate |
| MVP Timeline Risk | Low | Medium | High | Medium |

## Consequences

### Positive Consequences

- **Simpler codebase**: No complex delta resolution or reference tracking logic
- **Predictable performance**: Every read is a direct query, no cascading lookups
- **Easier testing**: Each branch is independent, tests don't need mock base branches
- **Clear data ownership**: Each branch fully owns its data, simplifying cleanup
- **Straightforward merge**: Compare two datasets directly without reconstructing state

### Negative Consequences

- **Higher storage usage**: Each branch stores full copy of all translations
- **Slower branch creation**: Must copy potentially thousands of records
- **Database growth**: Storage grows linearly with number of active branches
- **Migration complexity**: Moving to delta storage later requires data transformation

### Neutral Consequences

- **Standard database operations**: No special database features required
- **Backup simplicity**: Complete data in each branch, no dependency resolution needed

## Implementation Guidance

- Implement branch creation as bulk INSERT...SELECT operation for efficiency
- Add database index on (branchId, key) for fast lookups
- Consider batch processing for large branch operations (1000+ keys)
- Implement branch cleanup/archival to manage storage growth
- Track branch creation time and key count for monitoring
- Add soft-delete for branches to enable recovery

### Future Optimization Path

If storage becomes a concern post-MVP:

1. **Compression**: Implement value-level compression for translations
2. **Deduplication**: Store identical translations once with references
3. **Archival**: Move old branches to cold storage
4. **Delta migration**: Migrate to delta storage for long-lived branches while keeping full copy for active branches

## Related Information

- ADR-0004: API Framework Selection (affects bulk operation implementation)
- PRD Section 11.3: Branch Storage Strategy overview
- PRD NFR-SCA-003: Support 10,000+ keys per branch

## References

- [Copy-on-Write vs Merge-on-Read](https://www.dremio.com/blog/row-level-changes-on-the-lakehouse-copy-on-write-vs-merge-on-read-in-apache-iceberg/) - Data lakehouse patterns applicable to our use case
- [Shallow Copy for Data](https://lakefs.io/blog/shallow-copy-data/) - Branch and shallow clone concepts for data systems
- [Delta Cloning in Databricks](https://medium.com/globant/delta-cloning-in-azure-databricks-7e86d21b2606) - Deep vs shallow clone trade-offs
