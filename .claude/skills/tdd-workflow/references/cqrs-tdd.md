# CQRS Handler TDD Reference

Detailed TDD workflows for command and query handlers.

## Command Handler TDD

### Test Progression Order

1. **Happy path** - Command executes successfully
2. **Validation** - Invalid input rejected
3. **Not found** - Referenced entity doesn't exist
4. **Authorization** - User lacks permission
5. **Event emission** - Correct event published
6. **Idempotency** - Duplicate handling (if applicable)

### Example: CreateProjectHandler

**Test 1: Happy path**

```typescript
it('should create project with valid input', async () => {
  const command = new CreateProjectCommand({
    name: 'Test Project',
    slug: 'test-project',
    userId: 'user-123',
  });

  mockRepo.create.mockResolvedValue({
    id: 'proj-1',
    name: 'Test Project',
    slug: 'test-project',
    ownerId: 'user-123',
  });

  const result = await handler.execute(command);

  expect(result.id).toBe('proj-1');
  expect(mockRepo.create).toHaveBeenCalledWith({
    name: 'Test Project',
    slug: 'test-project',
    ownerId: 'user-123',
  });
});
```

**Test 2: Validation error**

```typescript
it('should throw ValidationError when slug is invalid', async () => {
  const command = new CreateProjectCommand({
    name: 'Test',
    slug: 'INVALID SLUG!',
    userId: 'user-123',
  });

  await expect(handler.execute(command)).rejects.toThrow(ValidationError);
  expect(mockRepo.create).not.toHaveBeenCalled();
});
```

**Test 3: Duplicate slug**

```typescript
it('should throw ConflictError when slug already exists', async () => {
  const command = new CreateProjectCommand({
    name: 'Test',
    slug: 'existing-slug',
    userId: 'user-123',
  });

  mockRepo.findBySlug.mockResolvedValue({ id: 'existing' });

  await expect(handler.execute(command)).rejects.toThrow(ConflictError);
});
```

**Test 4: Event emission**

```typescript
it('should emit ProjectCreated event', async () => {
  const command = new CreateProjectCommand({
    name: 'Test',
    slug: 'test',
    userId: 'user-123',
  });

  mockRepo.create.mockResolvedValue({ id: 'proj-1', name: 'Test', slug: 'test' });

  await handler.execute(command);

  expect(mockEventBus.publish).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'ProjectCreated',
      payload: expect.objectContaining({ projectId: 'proj-1' }),
    })
  );
});
```

## Query Handler TDD

### Test Progression Order

1. **Happy path** - Data returned successfully
2. **Not found** - Entity doesn't exist
3. **Filtering** - Query filters work correctly
4. **Pagination** - Limit/offset work correctly
5. **Authorization** - User can only see allowed data

### Example: GetProjectHandler

**Test 1: Happy path**

```typescript
it('should return project when found', async () => {
  const query = new GetProjectQuery({ projectId: 'proj-1', userId: 'user-123' });

  mockRepo.findById.mockResolvedValue({
    id: 'proj-1',
    name: 'Test Project',
    ownerId: 'user-123',
  });

  const result = await handler.execute(query);

  expect(result.id).toBe('proj-1');
  expect(result.name).toBe('Test Project');
});
```

**Test 2: Not found**

```typescript
it('should throw NotFoundError when project does not exist', async () => {
  const query = new GetProjectQuery({ projectId: 'nonexistent', userId: 'user-123' });

  mockRepo.findById.mockResolvedValue(null);

  await expect(handler.execute(query)).rejects.toThrow(NotFoundError);
});
```

**Test 3: Authorization**

```typescript
it('should throw ForbiddenError when user lacks access', async () => {
  const query = new GetProjectQuery({ projectId: 'proj-1', userId: 'other-user' });

  mockRepo.findById.mockResolvedValue({
    id: 'proj-1',
    ownerId: 'user-123', // Different owner
  });
  mockAccessService.canAccess.mockResolvedValue(false);

  await expect(handler.execute(query)).rejects.toThrow(ForbiddenError);
});
```

## List Query Handler TDD

**Test 1: Returns list**

```typescript
it('should return list of projects', async () => {
  const query = new ListProjectsQuery({ userId: 'user-123' });

  mockRepo.findByOwner.mockResolvedValue([
    { id: 'proj-1', name: 'Project 1' },
    { id: 'proj-2', name: 'Project 2' },
  ]);

  const result = await handler.execute(query);

  expect(result).toHaveLength(2);
});
```

**Test 2: Empty list**

```typescript
it('should return empty array when no projects', async () => {
  const query = new ListProjectsQuery({ userId: 'user-123' });

  mockRepo.findByOwner.mockResolvedValue([]);

  const result = await handler.execute(query);

  expect(result).toEqual([]);
});
```

**Test 3: Pagination**

```typescript
it('should apply pagination parameters', async () => {
  const query = new ListProjectsQuery({
    userId: 'user-123',
    limit: 10,
    offset: 20,
  });

  await handler.execute(query);

  expect(mockRepo.findByOwner).toHaveBeenCalledWith('user-123', {
    limit: 10,
    offset: 20,
  });
});
```

## Error Handling Tests

Always test error scenarios:

```typescript
it('should propagate repository errors', async () => {
  mockRepo.findById.mockRejectedValue(new Error('DB connection failed'));

  await expect(handler.execute(query)).rejects.toThrow('DB connection failed');
});
```

## Mock Verification

Verify mocks were called correctly:

```typescript
// Verify call count
expect(mockRepo.create).toHaveBeenCalledTimes(1);

// Verify not called
expect(mockRepo.delete).not.toHaveBeenCalled();

// Verify call order
expect(mockRepo.findById).toHaveBeenCalledBefore(mockEventBus.publish);
```
