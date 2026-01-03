# Translation Editor - Current Functionality

This document catalogs all existing functionality in the translation editor page for reference during UX redesign.

## Core Translation Features

1. **Inline Translation Editing** - Edit translations directly in the text area with auto-save
2. **Translation Validation** - Real-time validation with error display
3. **Save State Indicators** - Visual feedback for saving/saved states per language
4. **Approval Workflow** - Approve/reject translations with status badges (Approved, Pending, Rejected)
5. **Batch Approval** - Approve multiple translations at once

## Search & Filtering

6. **Text Search** - Search by key name or translation value
7. **Namespace Filter** - Filter by namespace
8. **Status Filter** - Filter by: All, Translated, Untranslated, Approved, Rejected
9. **Quality Filter** - Filter by quality score (Excellent, Good, Fair, Poor)
10. **Select All** - Select all visible keys

## AI & Machine Translation

11. **Machine Translation (MT)** - One-click MT for individual translations
12. **AI Translation** - Context-aware AI translations
13. **Fetch MT for All Languages** - Translate all empty languages at once
14. **Fetch AI for All Languages** - AI translate all empty languages
15. **Bulk Translate** - Batch translate selected keys with progress tracking
16. **Pre-translation** - Pre-translate via MT or AI
17. **Inline Suggestions** - Show MT/AI suggestions below the input with apply/dismiss

## Translation Memory & Glossary

18. **Translation Memory Panel** - Shows exact and fuzzy matches with similarity %
19. **TM Match Application** - One-click apply TM matches
20. **Glossary Panel** - Shows matching glossary terms (exact and partial)
21. **Glossary Term Application** - Apply glossary translations

## Quality Assurance

22. **Quality Score Badge** - Display overall quality score with dimensions (Accuracy, Fluency, Terminology)
23. **Quality Issues Display** - Show placeholder, punctuation, whitespace issues
24. **Issue Severity Levels** - Error, Warning, Info levels
25. **Bulk Quality Evaluation** - Evaluate quality for multiple translations

## Key Management

26. **Create Key** - Add new translation key with namespace and values
27. **Edit Key** - Modify existing key (name change)
28. **Delete Keys** - Bulk delete selected keys
29. **Key Name Suggestions** - AI-suggested key names based on source value
30. **Related Keys Section** - Show semantically related and same-file/component keys

## Navigation & UX

31. **Keyboard Navigation** - Navigate between keys and languages
32. **Expand/Collapse Keys** - Show detailed view or compact list
33. **Command Palette** - Quick actions via keyboard shortcut (copy from source, translate, approve)
34. **Language Toggle** - Switch source and target languages
35. **Language Focus** - Focus on specific language for editing
36. **Pagination** - Navigate through pages of keys

## Branch & Stats

37. **Branch Stats Bar** - Show completion %, total keys, language count
38. **Merge Branch Button** - Merge current branch to another
39. **Branch Header** - Display current branch name

## Batch Operations

40. **Multi-Select Keys** - Checkbox selection for batch operations
41. **Batch Actions Bar** - Actions for selected keys (translate, approve, reject, delete)
42. **Clear Selection** - Deselect all selected keys

## Display Features

43. **Translation Completion Progress** - Per-key completion indicator
44. **Mobile Responsive View** - Separate mobile-optimized layout
45. **Empty States** - Different empty states for no keys, no search results

---

## Key Files Reference

### Page & Layout

- `apps/web/src/app/(project)/projects/[projectId]/translations/[branchId]/page.tsx`
- `apps/web/src/app/(project)/projects/[projectId]/translations/[branchId]/_components/`

### Core Components

- `translation-key-card.tsx` - Individual key card with all languages
- `translation-row.tsx` - Single language row within a key
- `key-list.tsx` - List container for all keys
- `search-filter-bar.tsx` - Search and filter controls
- `batch-actions-bar.tsx` - Bulk action buttons
- `pagination-bar.tsx` - Page navigation

### Panels & Dialogs

- `translation-memory-panel.tsx` - TM matches sidebar
- `glossary-panel.tsx` - Glossary terms sidebar
- `translation-command-palette.tsx` - Keyboard shortcut actions
- `key-form-dialog.tsx` - Create/edit key modal
- `bulk-quality-evaluation-dialog.tsx` - Bulk QA dialog
- `bulk-translate-progress.tsx` - Bulk translation progress

### Quality

- `quality-score-badge.tsx` - Score display with dimensions
- `quality-issues.tsx` - Issue list display
- `quality-filter.tsx` - Filter by quality level

### Hooks

- `use-translation-mutations.ts` - Save, approve, delete operations
- `use-translations-page-data.ts` - Data fetching
- `use-key-selection.ts` - Selection state
- `use-tm-suggestions.ts` - TM match fetching
- `use-ai-translation.ts` - AI translation hooks
- `use-machine-translation.ts` - MT hooks
