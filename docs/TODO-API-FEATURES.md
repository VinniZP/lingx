# API Features Required for UI

> **Status:** Tracking document for UI features that need API implementation
> **Created:** 2024-12-29
> **Updated:** 2024-12-30

This document tracks UI features that are currently using placeholder data and need real API endpoints.

---

## Dashboard Page

### 1. Overall Completion Rate
**UI Location:** Hero stats section - "Complete" percentage
**Current:** Hardcoded `87%`
**Needed:**
- Calculate aggregate translation completion across all projects
- Formula: `(translated_keys / total_keys) * 100` for all projects combined

**Suggested Endpoint:**
```
GET /api/dashboard/stats
Response: {
  totalProjects: number,
  totalKeys: number,
  totalLanguages: number,
  completionRate: number, // 0-100
  translatedKeys: number
}
```

### 2. Activity Feed
**UI Location:** Right column - "Recent Activity" section
**Current:** Hardcoded array of 4 sample activities
**Needed:**
- Track user/project activities (translations, branch creation, imports, reviews)
- Return recent activities with type, description, project, timestamp

**Suggested Endpoint:**
```
GET /api/activity?limit=10
Response: {
  activities: [{
    id: string,
    type: 'translation' | 'branch' | 'review' | 'import' | 'export' | 'key_add' | 'key_delete',
    description: string,
    projectId: string,
    projectName: string,
    userId: string,
    userName: string,
    createdAt: string
  }]
}
```

**Database Schema Addition:**
```prisma
model Activity {
  id          String   @id @default(cuid())
  type        String   // translation, branch, review, import, etc.
  description String
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  metadata    Json?    // Additional context (key count, branch name, etc.)
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([projectId])
  @@index([createdAt])
}
```

---

## Projects Page

### 3. Per-Project Translation Progress
**UI Location:** Project cards - progress bar and percentage
**Current:** Random number between 60-100%
**Needed:**
- Calculate per-project completion: `(translated / total) * 100`
- Consider all target languages (not source)

**Suggested Enhancement to Existing Endpoint:**
```
GET /api/projects
Response: {
  projects: [{
    ...existing fields,
    stats: {
      totalKeys: number,
      translatedKeys: number,
      completionRate: number,
      lastActivity: string // ISO date
    }
  }]
}
```

Or separate stats endpoint:
```
GET /api/projects/:id/stats
Response: {
  totalKeys: number,
  translatedKeys: number,
  completionRate: number,
  languageStats: [{
    code: string,
    translated: number,
    total: number,
    percentage: number
  }]
}
```

### 4. Per-Project Key Count
**UI Location:** Project cards - stats row showing key count
**Current:** Random number between 50-550
**Needed:**
- Count of translation keys in each project

### 5. Total Keys Across All Projects
**UI Location:** Projects page header stats
**Current:** Hardcoded `0`
**Needed:**
- Sum of all keys across all user's projects

---

## New Project Form

### 6. Field-Level Server Validation Errors
**UI Location:** New Project form - all fields
**Current:** Server errors shown as toast notifications
**Needed:**
- Backend should return field-specific validation errors
- Frontend should display errors next to the relevant field using `form.setError()`

**Current Error Response:**
```json
{
  "error": "Project with this slug already exists"
}
```

**Suggested Error Response:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "slug",
      "message": "A project with this slug already exists"
    }
  ]
}
```

**Frontend Implementation:**
```typescript
onError: (error: ApiError) => {
  // Check if error has field-specific details
  if (error.details?.length) {
    error.details.forEach(({ field, message }) => {
      form.setError(field as keyof ProjectFormData, {
        type: 'server',
        message,
      });
    });
  } else {
    // Fallback to toast for generic errors
    toast.error('Failed to create project', {
      description: error.message,
    });
  }
}
```

**Validation Rules to Implement on Backend:**
- `name`: Check for duplicates within user's projects (optional)
- `slug`: Check for global uniqueness (required)
- `languages`: Validate language codes exist
- `defaultLanguage`: Must be included in selected languages

---

## Priority Order

### API Features
1. **High:** Project stats (key count, completion rate) - Most visible, affects both pages
2. **High:** Dashboard aggregate stats - Primary landing page
3. **High:** Field-level server validation - Better UX for form errors
4. **Medium:** Activity feed (Dashboard + Project) - Useful but can remain placeholder initially
5. **Medium:** Project activity feed - Project details page sidebar (uses same Activity model)
6. **Medium:** Translation sources (cross-branch) - UI ready with "Coming soon" placeholder
7. **Low:** Server-side search/filter - Client-side works for reasonable project counts

### UI/UX Improvements
8. **Medium:** Improved skeleton loaders - Match content layout for less jarring transitions
9. **Medium:** Empty states for new users - Onboarding guidance when no projects exist
10. **Low:** Replace dashboard placeholders - Once APIs are ready

---

## Premium UI/UX Improvements

### Design System Updates (Completed)
The following UI components were updated to achieve a premium, consistent look:

**Sizing System (h-11 = 44px standard):**
- All form inputs: `h-11`, `rounded-xl`, `bg-card`, `border-border`
- Buttons: `h-11` default, `h-9` small, `h-12` large
- Select triggers: `h-11`, full-width, `rounded-xl`
- Toolbar elements: consistent `h-11` height

**Form Components:**
- `FormMessage`: Includes AlertCircle icon for error visibility
- `FormDescription`: Smaller `text-xs` for helper text hierarchy
- `FormLabel`: Turns red on error state automatically

**Visual Polish:**
- Islands/cards with subtle inner glow shadows
- Premium easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Staggered animations with exponential delay curve
- Card hover effects with elevation change

### Empty State & Placeholder Strategy
To avoid sparse layouts before real data exists:

| Page | Placeholder Content | Real Data Needed |
|------|---------------------|------------------|
| Dashboard | Hero stats (hardcoded 87%), Activity feed (4 items), CLI hint, Resources section | Stats API, Activity API |
| Projects | Random progress bars, random key counts | Project stats API |
| New Project | Form with validation | Field-level server errors |

### 7. Dashboard Placeholder Content
**UI Location:** Dashboard page
**Current State:**
- "Complete: 87%" - hardcoded
- Activity feed with 4 fake activities
- CLI integration hint section
- Resources/documentation links

**Future Consideration:**
- Replace placeholders once APIs exist
- Consider empty states for new users (no projects yet)
- Onboarding flow for first-time users

### 8. Loading States & Skeletons
**UI Location:** All data-fetching pages
**Current:** Basic skeleton loaders
**Needed:**
- Skeleton shapes should match actual content layout
- Staggered skeleton animations for premium feel
- Error boundaries with retry actions

---

## Project Details Page

### 9. Project Activity Feed
**UI Location:** Project details page - "Recent Activity" section (right sidebar)
**Current:** Placeholder data with 4 hardcoded activities
**Needed:**
- Track project-specific activities (translations, branch operations, imports)
- Return recent activities scoped to a single project

**Suggested Endpoint:**
```
GET /api/projects/:id/activity?limit=10&offset=0

Response: {
  activities: [{
    id: string,
    type: 'translation' | 'key_add' | 'key_delete' | 'branch' | 'merge' | 'import' | 'export',
    description: string,
    userId: string,
    userName: string,
    metadata?: Record<string, unknown>,
    createdAt: string // ISO date
  }]
}
```

**Database Schema:** Uses the same `Activity` model defined in section 2 (Dashboard Activity Feed)

**Frontend API Addition:**
```typescript
// Add to apps/web/src/lib/api.ts

export interface ProjectActivity {
  id: string;
  type: string;
  description: string;
  userId: string;
  userName: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Add to projectApi object:
getActivity: (id: string, params?: { limit?: number; offset?: number }) => {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return fetchApi<{ activities: ProjectActivity[] }>(
    `/api/projects/${id}/activity${queryString ? `?${queryString}` : ''}`
  );
},
```

**Backend Implementation:**
```typescript
// Add to apps/api/src/routes/projects.ts

fastify.get(
  '/api/projects/:id/activity',
  {
    onRequest: [fastify.authenticate],
    schema: {
      params: { type: 'object', properties: { id: { type: 'string' } } },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10, maximum: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
    },
  },
  async (request, _reply) => {
    const { id } = request.params;
    const { limit = 10, offset = 0 } = request.query;

    // Check membership
    const isMember = await projectService.checkMembership(id, request.user.userId);
    if (!isMember) throw new ForbiddenError('Not a member');

    const activities = await fastify.prisma.activity.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      activities: activities.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        userId: a.userId,
        userName: a.user.name || a.user.email.split('@')[0],
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
);
```

**Activity Logging Service:**
Create `apps/api/src/services/activity.service.ts`:
```typescript
export class ActivityService {
  constructor(private prisma: PrismaClient) {}

  async log(input: {
    type: string;
    description: string;
    projectId: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.activity.create({
      data: {
        type: input.type,
        description: input.description,
        projectId: input.projectId,
        userId: input.userId,
        metadata: input.metadata || {},
      },
    });
  }
}
```

**Integration Points:**
Add activity logging calls to:
- Translation updates (type: 'translation')
- Key creation/deletion (type: 'key_add', 'key_delete')
- Branch creation (type: 'branch')
- Branch merge (type: 'merge')
- Import operations (type: 'import')
- Export operations (type: 'export')

**Frontend Connection:**
Update `apps/web/src/app/(project)/projects/[projectId]/page.tsx`:
```typescript
// Replace placeholder data with real API call
const { data: activityData, isLoading: activityLoading } = useQuery({
  queryKey: ['project-activity', projectId],
  queryFn: () => projectApi.getActivity(projectId, { limit: 10 }),
});

const activities = activityData?.activities || [];
```

**Related Files:**
- `apps/web/src/app/(project)/projects/[projectId]/page.tsx` - Uses placeholder activity
- `apps/web/src/lib/api.ts` - Add `getActivity` method
- `apps/api/src/routes/projects.ts` - Add endpoint
- `apps/api/prisma/schema.prisma` - Activity model (shared with dashboard)

---

## Translations Page

### 10. Translation Sources (Cross-Branch References)
**UI Location:** Translation editor right panel - "From Other Branches" section
**Current:** Placeholder showing "Coming soon"
**Needed:**
- Fetch the same translation key from other branches in the same space
- Allow users to see how a key is translated in other branches (e.g., main vs feature branch)
- Enable click-to-copy functionality to use another branch's value as a starting point

**Suggested Endpoint:**
```
GET /api/keys/:keyId/sources?branchId=current_branch_id
Response: {
  sources: [{
    branchId: string,
    branchName: string,
    isDefault: boolean,
    translations: Record<string, string> // language code -> value
  }]
}
```

**Alternative Approach:** Expand existing key response
```
GET /api/keys/:keyId?includeSources=true
Response: {
  ...existing key fields,
  otherBranchValues: [{
    branchId: string,
    branchName: string,
    translations: Record<string, string>
  }]
}
```

**Backend Implementation:**
```typescript
// Find keys with same name in sibling branches
const siblingBranches = await prisma.branch.findMany({
  where: {
    spaceId: currentBranch.spaceId,
    id: { not: currentBranchId }
  }
});

const sources = await Promise.all(
  siblingBranches.map(async (branch) => {
    const key = await prisma.translationKey.findFirst({
      where: { branchId: branch.id, name: keyName },
      include: { translations: true }
    });
    if (!key) return null;
    return {
      branchId: branch.id,
      branchName: branch.name,
      isDefault: branch.isDefault,
      translations: Object.fromEntries(
        key.translations.map(t => [t.language, t.value])
      )
    };
  })
);
```

**Related Files:**
- `apps/web/src/components/translations/translation-editor.tsx` - Has "Coming soon" placeholder
- `apps/web/src/app/(project)/projects/[projectId]/translations/[branchId]/page.tsx` - Main translations page

---

## Implementation Notes

### Completion Rate Calculation
```typescript
// For a project with multiple target languages
const calculateCompletion = (project) => {
  const targetLanguages = project.languages.filter(l => !l.isDefault);
  const totalSlots = project.keys.length * targetLanguages.length;
  const filledSlots = project.translations.filter(t =>
    t.value && t.value.trim() !== '' && !t.languageIsDefault
  ).length;
  return totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
};
```

### Activity Tracking
Activities should be logged when:
- Translation is added/updated
- Key is created/deleted
- Branch is created/merged
- Import is completed
- Export is performed
- Project settings changed
- Team member added/removed

---

## Current API Endpoints Reference

Existing endpoints that may need enhancement:

| Endpoint | Current | Enhancement Needed |
|----------|---------|-------------------|
| `GET /api/projects` | Returns basic project info | Add `stats` object |
| `GET /api/projects/:id` | Returns project details | Add key count, completion |
| `GET /api/projects/:id/stats` | Returns branch stats | Add translation completion |

---

## User Preferences Integration (Future)

### 11. User Preferences - Make Them Functional
**Status:** 🔮 Postponed - preferences UI is complete, integration can wait
**UI Location:** Profile settings page - Preferences section
**Current:** UI saves preferences to database, but they don't actually do anything
**Needed:** Wire up preferences to affect the actual app behavior

#### Theme Preference
**Current State:** Stored in `user.preferences.theme` ('system' | 'light' | 'dark')
**Integration:**
- On login/app load, read user's theme preference from API
- Apply to `next-themes` provider
- When preference changes, update `next-themes` immediately

```typescript
// apps/web/src/lib/auth.tsx - Add theme sync
import { useTheme } from 'next-themes';

// In AuthProvider, after fetching user profile:
useEffect(() => {
  if (user?.preferences?.theme) {
    setTheme(user.preferences.theme);
  }
}, [user?.preferences?.theme, setTheme]);
```

#### Language Preference (i18n)
**Current State:** Stored in `user.preferences.language` ('en' | 'es' | 'fr' | 'de' | 'ja')
**Future Integration:**
- Requires setting up i18n (next-intl or similar)
- On login, set app locale based on preference
- Store translations in `messages/` folder
- Low priority until LocaleFlow needs translation itself

#### Default Project
**Current State:** Stored in `user.preferences.defaultProjectId` (string | null)
**Integration:**
- On dashboard load, if `defaultProjectId` is set and valid, redirect to that project
- Add redirect logic to dashboard page

```typescript
// apps/web/src/app/(dashboard)/dashboard/page.tsx
useEffect(() => {
  if (profile?.preferences?.defaultProjectId) {
    const hasProject = projectsData?.projects?.some(
      p => p.id === profile.preferences.defaultProjectId
    );
    if (hasProject) {
      router.replace(`/projects/${profile.preferences.defaultProjectId}`);
    }
  }
}, [profile?.preferences?.defaultProjectId, projectsData, router]);
```

#### Notification Preferences
**Current State:** Stored in `user.preferences.notifications`:
- `email`: boolean - Receive email notifications
- `inApp`: boolean - Show in-app notifications
- `digestFrequency`: 'never' | 'daily' | 'weekly'

**Integration:**
- **Email notifications:** When sending emails (activity digest, etc.), check `notifications.email` first
- **In-app notifications:** Check `notifications.inApp` before showing toasts/badges
- **Digest frequency:** Set up cron job to send activity digest based on preference

```typescript
// apps/api/src/services/email.service.ts - Check preferences
async sendActivityDigest(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true, email: true }
  });

  const prefs = user?.preferences as UserPreferences | null;
  if (!prefs?.notifications?.email) return; // User disabled emails
  if (prefs?.notifications?.digestFrequency === 'never') return;

  // Send digest...
}
```

**Implementation Priority:** (All postponed - can implement when needed)
1. Theme preference sync (easiest, immediate UX impact)
2. Default project redirect (useful workflow improvement)
3. Email/in-app notification preferences (requires notification system)
4. Language/i18n (requires translation setup)

**Related Files:**
- `apps/web/src/app/(dashboard)/settings/profile/page.tsx` - Preferences UI (done)
- `apps/api/src/services/profile.service.ts` - Preferences storage (done)
- `apps/web/src/lib/auth.tsx` - Add theme sync
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Add default project redirect
- `apps/api/src/services/email.service.ts` - Check notification preferences

---

## Related Files

### Frontend
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Dashboard UI
- `apps/web/src/app/(dashboard)/projects/page.tsx` - Projects list UI
- `apps/web/src/app/(dashboard)/projects/new/page.tsx` - New project form (uses zod + react-hook-form)

### API
- `apps/api/src/routes/projects.ts` - Projects API routes
- `apps/api/src/services/project.service.ts` - Projects service

### UI Components (updated for premium styling)
- `apps/web/src/components/ui/form.tsx` - Form components with validation
- `apps/web/src/components/ui/input.tsx` - h-11 rounded-xl inputs
- `apps/web/src/components/ui/select.tsx` - h-11 rounded-xl select
- `apps/web/src/components/ui/textarea.tsx` - rounded-xl textarea
- `apps/web/src/components/ui/button.tsx` - h-11 rounded-xl buttons
