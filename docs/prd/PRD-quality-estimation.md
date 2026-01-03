# PRD: AI Quality Estimation (Auto-Score Translations)

**Version**: 1.0
**Date**: 2026-01-02
**Status**: Draft

---

## 1. Executive Summary

### One-line Summary

AI-powered translation quality scoring that uses tiered heuristic-first evaluation to flag translations needing review while minimizing token costs.

### Background

Translation quality assurance is a significant bottleneck in localization workflows. Lokalise reports that their AI scoring feature allows teams to skip 80% of human reviews when translations score >=80. Currently, Lingx users have no automated way to assess translation quality at scale.

The challenge: balancing token usage (cost) with productivity gains. Full AI scoring of every translation is expensive (~$0.80/10K translations), while no scoring leaves users blind to quality issues.

### Real-World Problem

> "We use AI translation for speed, but we have no idea which translations are good and which need human review. We either review everything (slow) or review nothing (risky)."

This feature addresses this by:
1. Automatically scoring translations using free heuristics first (ICU syntax, placeholders, length)
2. Escalating only uncertain cases to AI evaluation
3. Flagging low-quality translations for human review

---

## 2. Problem Statement

### Current Pain Points

| Pain Point | Impact | Affected Users |
|------------|--------|----------------|
| No quality visibility | Cannot identify problematic translations | Translation Managers |
| Manual review bottleneck | Every AI translation requires human review | QA Teams |
| Silent failures | ICU syntax errors, missing placeholders go unnoticed | Developers |
| No prioritization | All translations treated equally regardless of quality | Translation Managers |

### Market Gap

| Platform | Quality Scoring | Approach |
|----------|-----------------|----------|
| **Lokalise** | Yes (AI) | MQM-based, >=80 auto-approve, skip 80% reviews |
| **Crowdin** | Limited | AI proofreading agent, batch processing |
| **Phrase** | Yes | MQM analytics, workflow orchestration |
| **Lingx (current)** | Partial (heuristics only) | Pass/fail checks, no numeric scores |

### Existing Infrastructure

Lingx already has a quality check system (`packages/shared/src/validation/quality-checks/`):

| Existing Check | Status | What it does |
|----------------|--------|--------------|
| **Placeholder check** | ✅ Complete | Missing/extra `{variables}` |
| **Whitespace check** | ✅ Complete | Leading/trailing, double spaces |
| **Punctuation check** | ✅ Complete | Ending punctuation mismatch |
| **Length check** | ✅ Complete | Uses `LANGUAGE_RATIOS` for expansion |
| **CLI integration** | ✅ Complete | `lingx check --quality` |

**What's Missing:**
- Numeric scores (0-100) instead of pass/fail
- ICU syntax validation
- Glossary compliance checking
- AI evaluation for semantic issues
- Score persistence and UI display

---

## 3. Goals and Success Metrics

### Business Goals

1. **Enable quality-based prioritization** - Flag translations that need human attention
2. **Reduce review overhead** - Auto-approve high-quality translations (>=80 score)
3. **Catch technical errors** - Detect ICU syntax issues, missing placeholders
4. **Control costs** - Keep scoring overhead under 20% of translation cost

### Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Review bypass rate | 70%+ translations score >=80 | Quality score distribution |
| Scoring cost | <$0.50/10K translations | AI usage tracking |
| Heuristic efficiency | 70%+ scored without AI | Evaluation type breakdown |
| ICU error detection | 100% syntax errors caught | Pre-check validation |
| Average scoring latency | <200ms heuristics, <5s AI | Performance monitoring |

---

## 4. User Personas and Journeys

### Persona 1: Translation Manager

**Profile**: Manages translation quality across multiple languages
**Goals**: Quickly identify translations needing review, prioritize review queue

**Journey**:
1. Opens branch translation view
2. Sees quality score column (color-coded: green >=80, yellow 60-79, red <60)
3. Filters by "Needs Review" to see flagged translations
4. Reviews and approves flagged items
5. Merges branch knowing quality is assured

### Persona 2: Developer

**Profile**: Uses AI translation for rapid prototyping
**Goals**: Know which AI translations are production-ready

**Journey**:
1. Runs bulk AI translation on 100 keys
2. Sees immediate heuristic scores (ICU valid, placeholders preserved)
3. Background job completes AI evaluation on uncertain cases
4. Reviews quality summary: "85 passed (>=80), 15 need review"
5. Opens review queue for 15 flagged translations

### Persona 3: QA Engineer

**Profile**: Responsible for release quality gates
**Goals**: Ensure translations meet quality threshold before deployment

**Journey**:
1. Before branch merge, sees quality summary widget
2. Average score: 87, 5 translations below threshold
3. Reviews 5 flagged translations
4. Approves or fixes each
5. Merges branch with confidence

---

## 5. Feature Requirements

### 5.1 Scoring Triggers (Configurable)

| Trigger | Default | Description |
|---------|---------|-------------|
| After AI translation | ON | Score immediately after AI/MT generates translation |
| On-demand | Always | User clicks "Check Quality" or runs CLI command |
| Before branch merge | OFF | Quality gate check before merge allowed |

**Configuration**: Project Settings > AI > Quality Scoring

### 5.2 Tiered Evaluation System

#### Level 1: Heuristics (Free, <50ms)

| Check | Weight | Description |
|-------|--------|-------------|
| ICU Syntax | 20% | Parse with @messageformat/parser |
| Placeholder Integrity | 20% | All {vars}, %s preserved |
| Length Ratio | 10% | Within expected range for language pair |
| Glossary Compliance | 10% | Required terms present |

**Pass threshold**: All checks pass = Score 90-100, no AI needed

#### Level 2: AI Evaluation (On-demand, <5s batched)

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Accuracy | 40% | Semantic fidelity to source |
| Fluency | 25% | Natural language quality |
| Terminology | 15% | Glossary compliance (deeper check) |
| Format | 20% | Structure preservation |

**Triggers for AI**: Heuristic uncertainty (length ratio warning, partial glossary match)

### 5.3 Score Display

- **Score range**: 0-100
- **Color coding**:
  - Green (>=80): Ready for production
  - Yellow (60-79): Consider review
  - Red (<60): Needs attention
- **Visibility**: All users see scores
- **Storage**: Permanent (for historical analysis)

### 5.4 ICU Pre-Check (Separate from Scoring)

- Validates ICU MessageFormat syntax on save
- Instant feedback (<50ms)
- Blocks invalid syntax with clear error message
- Not part of quality score (separate concern)

### 5.5 Low Score Action

- **Flag for review**: Add warning icon, include in "Needs Review" filter
- **No blocking**: Users can still publish/export low-score translations
- **Dashboard widget**: Summary of translations by quality tier

---

## 6. User Experience

### 6.1 Translation Editor

```
┌─────────────────────────────────────────────────────────┐
│ Key: welcome.message                                    │
├─────────────────────────────────────────────────────────┤
│ English (source)                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Welcome, {name}! You have {count, plural, ...}      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ German                                          [92] ● │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Willkommen, {name}! Sie haben {count, plural, ...}  │ │
│ └─────────────────────────────────────────────────────┘ │
│ ✓ ICU syntax valid  ✓ Placeholders preserved           │
│                                                         │
│ French                                          [67] ◐ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Bienvenue, {name}! Vous avez {count, plural, ...}   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ⚠ Fluency: Slightly awkward phrasing                   │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Branch Quality Summary

```
┌─────────────────────────────────────────────────────────┐
│ Quality Overview                                        │
├─────────────────────────────────────────────────────────┤
│ Average Score: 87                                       │
│                                                         │
│ ████████████████████░░░░ 85% Excellent (>=80)          │
│ ████░░░░░░░░░░░░░░░░░░░░ 12% Good (60-79)              │
│ █░░░░░░░░░░░░░░░░░░░░░░░  3% Needs Review (<60)        │
│                                                         │
│ By Language:                                            │
│ de: 91  fr: 84  es: 88  ja: 82  zh: 79                 │
│                                                         │
│ [View Flagged Translations (12)]                        │
└─────────────────────────────────────────────────────────┘
```

### 6.3 CLI Output

```bash
$ lingx check --quality

Quality Report for branch: feature/new-checkout
═══════════════════════════════════════════════

Translations Analyzed: 245
Average Score: 86

Distribution:
  >=80 (Excellent): 208 (85%)
  60-79 (Good):      29 (12%)
  <60 (Review):       8 (3%)

Flagged Translations:
  ✗ checkout.total (ja): Score 45 - Missing placeholder {currency}
  ✗ checkout.items (zh): Score 52 - ICU plural form incorrect
  ✗ errors.network (de): Score 58 - Fluency issues detected
  ... 5 more

Run 'lingx check --quality --details' for full report
```

---

## 7. Non-Requirements (Out of Scope)

- **Auto-fix**: Automatically correcting low-quality translations
- **Re-translate on low score**: Triggering new translation attempt
- **Block publishing**: Preventing export of low-score translations
- **Score in SDK**: Runtime quality checks in applications
- **Translation memory impact**: Using scores for TM matching

---

## 8. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI scoring costs exceed budget | High | Low | Aggressive heuristic-first approach |
| Heuristics give false confidence | Medium | Medium | Clear "Heuristic only" indicator in UI |
| LLM API rate limits | Low | Low | Existing rate limiting, retry logic |
| Score inconsistency | Medium | Medium | User-configurable model, not provider-dependent |
| User ignores scores | Medium | Medium | Dashboard prominence, optional merge gates |

---

## 9. Dependencies

- **Existing AI translation service**: Reuse provider configs, model selection
- **Existing BullMQ infrastructure**: Background job processing
- **@messageformat/parser**: ICU syntax validation (MIT license)

---

## 10. Open Questions

1. Should quality scores affect translation memory matching relevance?
2. Should there be project-wide vs branch-specific quality thresholds?
3. Should we track score changes over time (re-evaluation on edit)?

---

## 11. Timeline Considerations

**Phase 1**: Heuristic scoring + ICU pre-check (quick win)
**Phase 2**: AI evaluation integration
**Phase 3**: UI components (editor, dashboard, CLI)
**Phase 4**: Branch merge quality gate (optional feature)
