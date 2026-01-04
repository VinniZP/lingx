---
description: Debug an API endpoint issue
argument-hint: <endpoint-or-error> (e.g., POST /api/projects, "404 not found")
allowed-tools: Read, Grep, Glob, Bash(git:*)
---

Debug API issue: **$ARGUMENTS**

## Step 1: Identify the Endpoint

Parse the input to find:

- HTTP method and path (e.g., `POST /api/projects`)
- Error message or status code
- Related route file

Search for the route:

```bash
# Find route file
grep -r "prefix.*$PATH" apps/api/src/app.ts
ls apps/api/src/routes/
```

## Step 2: Trace the Request Flow

For the identified endpoint, trace through:

### 2.1 Route Handler

- Read the route file: `apps/api/src/routes/<resource>.ts`
- Check request schema validation (Zod)
- Check authentication hook
- Identify which service methods are called

### 2.2 Service Layer

- Read the service: `apps/api/src/services/<resource>.service.ts`
- Check business logic
- Check database queries
- Check for potential error throws

### 2.3 Authorization

- Check if `AccessService.verify*Access()` is used
- Verify correct role requirement

### 2.4 DTO Transformation

- Check if response goes through DTO
- Verify DTO handles all fields correctly

## Step 3: Common Issues Checklist

| Symptom          | Likely Cause                      | Check                                            |
| ---------------- | --------------------------------- | ------------------------------------------------ |
| 401 Unauthorized | Missing/invalid auth              | Is `onRequest: [fastify.authenticate]` present?  |
| 403 Forbidden    | Wrong role                        | Is correct role passed to `verifyProjectAccess`? |
| 404 Not Found    | Resource missing OR access denied | Check if `NotFoundError` hides access denial     |
| 400 Validation   | Schema mismatch                   | Compare request body with Zod schema             |
| 409 Conflict     | Duplicate resource                | Check unique constraints in service              |
| 500 Internal     | Unhandled error                   | Check for missing null checks                    |

## Step 4: Check Error Handling

Verify error handling:

- Service throws typed errors (NotFoundError, etc.)?
- Global error handler catches them?
- Error response format correct?

## Step 5: Database Queries

If issue involves data:

- Check Prisma query includes
- Check where clauses
- Look for N+1 queries
- Verify transaction usage

## Step 6: Provide Diagnosis

```markdown
## API Debug Report

### Endpoint

`METHOD /api/path`

### Issue Identified

[Description of the problem]

### Root Cause

[What's causing the issue]

### Location

`apps/api/src/routes/file.ts:line`

### Suggested Fix

[Code changes needed]

### Additional Notes

[Any related issues or improvements]
```

## Knowledge: Common Patterns

### Route Registration

Routes registered in `apps/api/src/app.ts`:

```typescript
app.register(projectRoutes, { prefix: '/api/projects' });
```

### Authentication

```typescript
app.get('/', {
  onRequest: [fastify.authenticate], // Requires auth
  // ...
});
```

### Authorization

```typescript
await accessService.verifyProjectAccess(
  request.userId,
  projectId,
  'editor' // Required role
);
```

### Error Throwing

```typescript
// Service throws
throw new NotFoundError('Project not found');

// Global handler catches and formats response
```
