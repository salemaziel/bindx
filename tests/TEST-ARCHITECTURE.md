# Bindx Test Architecture

## Current State (Updated)

### Test Directory Structure

```
tests/
├── setup.ts                        # Happy-DOM setup (test preload)
├── shared/
│   └── helpers.ts                  # Shared DOM query helpers
│
├── unit/                           # Pure unit tests (no React)
│   ├── shared/
│   │   └── unitTestHelpers.ts      # Shared utilities for unit tests
│   ├── store/
│   │   └── snapshotStore.test.ts   # SnapshotStore tests (~50 tests)
│   ├── events/
│   │   └── eventEmitter.test.ts    # EventEmitter tests (~20 tests)
│   ├── core/
│   │   └── actionDispatcher.test.ts # ActionDispatcher tests (~15 tests)
│   ├── handles/
│   │   ├── fieldHandle.test.ts     # FieldHandle tests (~12 tests)
│   │   ├── entityHandle.test.ts    # EntityHandle tests (~15 tests)
│   │   ├── hasOneHandle.test.ts    # HasOneHandle tests (~10 tests)
│   │   └── hasManyHandle.test.ts   # HasManyListHandle tests (~10 tests)
│   ├── persistence/
│   │   ├── batchPersister.test.ts
│   │   ├── deduplication.test.ts
│   │   ├── dependencies.test.ts
│   │   ├── errors.test.ts
│   │   ├── fieldPersistence.test.ts
│   │   ├── pessimistic.test.ts
│   │   └── rollback.test.ts
│   └── errors/
│       ├── errorClassification.test.ts
│       └── pathMapper.test.ts
│
├── react/                          # React integration tests
│   ├── hooks/
│   │   ├── useEntity/
│   │   │   ├── loading.test.tsx
│   │   │   ├── rendering.test.tsx
│   │   │   ├── mutations.test.tsx
│   │   │   ├── dirtyState.test.tsx
│   │   │   ├── reset.test.tsx
│   │   │   ├── persist.test.tsx
│   │   │   └── relations.test.tsx
│   │   └── useEntityList/
│   │       └── useEntityList.test.tsx
│   ├── relations/
│   │   ├── hasOne/
│   │   │   ├── connect.test.tsx
│   │   │   ├── disconnect.test.tsx
│   │   │   ├── reset.test.tsx
│   │   │   ├── dirtyState.test.tsx
│   │   │   └── persist.test.tsx
│   │   └── hasMany/
│   │       ├── items.test.tsx
│   │       ├── dirtyState.test.tsx
│   │       ├── persist.test.tsx
│   │       └── batching.test.tsx
│   └── roles/
│       └── roles.test.tsx
│
├── cases/                          # Legacy integration tests (to be reorganized)
│   ├── entityCreateMode.test.tsx
│   └── fieldMutations.test.tsx
│
├── repeater/
│   └── repeater.test.tsx           # Repeater component tests
│
└── (root-level test files)         # High-level integration tests
    ├── events.test.tsx
    ├── createComponent.test.tsx
    ├── identityMapSync.test.tsx
    ├── typedQueries.test.ts
    ├── queryBuilding.test.ts
    ├── interoperability.test.ts
    ├── typeSafety.test.ts
    ├── mutationCollector.test.ts
    └── undo.test.ts
```

---

## Completed Phases

### Phase 1: Test Structure Reorganization ✅

- Split monolithic `useEntity.test.tsx` into focused test files:
  - `tests/react/hooks/useEntity/loading.test.tsx`
  - `tests/react/hooks/useEntity/rendering.test.tsx`
  - `tests/react/hooks/useEntity/mutations.test.tsx`
  - `tests/react/hooks/useEntity/dirtyState.test.tsx`
  - `tests/react/hooks/useEntity/reset.test.tsx`
  - `tests/react/hooks/useEntity/persist.test.tsx`
  - `tests/react/hooks/useEntity/relations.test.tsx`

### Phase 2: HasOne Relation Tests ✅

- Split `hasOne.test.tsx` into focused test files:
  - `tests/react/relations/hasOne/connect.test.tsx`
  - `tests/react/relations/hasOne/disconnect.test.tsx`
  - `tests/react/relations/hasOne/reset.test.tsx`
  - `tests/react/relations/hasOne/dirtyState.test.tsx`
  - `tests/react/relations/hasOne/persist.test.tsx`

### Phase 3: HasMany Relation Tests ✅

- Split `hasMany.test.tsx` into focused test files:
  - `tests/react/relations/hasMany/items.test.tsx`
  - `tests/react/relations/hasMany/dirtyState.test.tsx`
  - `tests/react/relations/hasMany/persist.test.tsx`
  - `tests/react/relations/hasMany/batching.test.tsx`

### Phase 4: Core Module Unit Tests ✅

- Created comprehensive unit tests for core modules:
  - `tests/unit/store/snapshotStore.test.ts` - ~50 tests covering:
    - Entity snapshots (create, update, commit, reset, remove, immutability)
    - Entity metadata (existsOnServer, scheduled deletion, temp IDs)
    - Has-many state (server IDs, plan connect/disconnect, ordering, move)
    - Has-one relations (create, update, commit, reset)
    - Error state (add/clear field/entity/relation errors)
    - Subscriptions (entity, relation, global notifications)
    - Dirty tracking
    - Parent-child relationships
    - Partial snapshot export/import

  - `tests/unit/events/eventEmitter.test.ts` - ~20 tests covering:
    - Global listener subscriptions
    - Entity-scoped subscriptions
    - Field-scoped subscriptions
    - Listener order (field → entity → global)
    - Interceptors (global, entity, field scoped)
    - Interceptor cancel/modify actions
    - Async interceptors
    - Utility methods (clear, listenerCount)

  - `tests/unit/core/actionDispatcher.test.ts` - ~15 tests covering:
    - Sync dispatch for all action types
    - Middleware execution and cancellation
    - Async dispatch with interceptors
    - Event emission

  - `tests/unit/handles/fieldHandle.test.ts` - ~12 tests covering:
    - Value access (value, serverValue)
    - Dirty state detection
    - setValue and error clearing
    - Touched state
    - Input props
    - Nested fields
    - Error handling
    - Event subscriptions

  - `tests/unit/handles/entityHandle.test.ts` - ~15 tests covering:
    - Identity (id, type)
    - Data access
    - Load state
    - Dirty state
    - Persisting state
    - New entity detection
    - Field access and caching
    - Relation access
    - Reset/commit
    - Errors
    - Event subscriptions

  - `tests/unit/handles/hasOneHandle.test.ts` - ~10 tests covering:
    - State detection
    - Related ID access
    - Entity accessor
    - Dirty state
    - Connect/disconnect/delete
    - Reset
    - Errors
    - Event subscriptions

  - `tests/unit/handles/hasManyHandle.test.ts` - ~10 tests covering:
    - Items access
    - Map iteration
    - Dirty state
    - Connect/disconnect
    - Add/remove
    - Move
    - Reset
    - Errors
    - Event subscriptions

---

## Test Conventions

### File Naming

```
<module>.test.ts       # Unit tests (no React)
<component>.test.tsx   # React components
<feature>.test.tsx     # Integration tests
```

### Test Structure

```typescript
describe('<ModuleName>', () => {
  let store: SnapshotStore

  beforeEach(() => {
    store = new SnapshotStore()
  })

  describe('<methodName>', () => {
    test('should <expected behavior> when <condition>', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### Test Naming

```typescript
// ✅ Good
test('should return null when entity does not exist')
test('should mark field as dirty after setValue')
test('should throw when called outside provider')

// ❌ Bad
test('works correctly')
test('test case 1')
test('handles edge case')
```

---

## Shared Test Utilities

### `tests/shared/helpers.ts`

DOM query helpers for React tests:
- `getByTestId(container, testId)` - Query by testid, throws if not found
- `queryByTestId(container, testId)` - Query by testid, returns null if not found
- `getAllByTestId(container, testId)` - Query all by testid
- `createClientError(message, code?)` - Create client error object

### `tests/unit/shared/unitTestHelpers.ts`

Utilities for pure unit tests:
- `createTestStore()` - Create fresh SnapshotStore
- `createTestDispatcher()` - Create ActionDispatcher with store and EventEmitter
- `setupEntity()` - Set up test entity with data
- `createMockSubscriber()` - Create mock subscription function
- `createArticleData()`, `createAuthorData()`, `createTagData()` - Sample data factories
- `waitFor()` - Async condition waiting
- `createDeferred()` - Create controllable promise

---

## Running Tests

```bash
# Run all tests
bun test

# Run a specific test file
bun test tests/unit/store/snapshotStore.test.ts

# Run tests matching a pattern
bun test --grep "SnapshotStore"

# Run tests in a directory
bun test tests/unit/

# Type check
bun run typecheck
```

---

## Coverage Goals

| Area | Target |
|------|--------|
| `@contember/bindx` core | 80%+ |
| `@contember/react-bindx` | 80%+ |
| `@contember/bindx-form` | 85%+ |
| `@contember/bindx-uploader` | 85%+ |

---

## Future Work

### Potential Improvements

1. **Additional Unit Tests**
   - Selection builder tests
   - Query spec tests
   - Mutation collector tests

2. **Edge Case Tests**
   - Circular relations
   - Deep nesting
   - Large datasets
   - Concurrent mutations

3. **Performance Tests**
   - Large entity counts
   - Rapid mutation sequences
   - Memory usage

4. **E2E Integration Tests**
   - Full form lifecycle
   - Multi-entity editing
   - Error recovery scenarios
