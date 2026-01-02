```markdown
# Task: Implement Type-Safe React Data Binding Framework

## Goal
Create a runtime, backend-agnostic, fully type-safe data binding framework for React that enables declarative data fetching and mutations with excellent composability and developer experience.

## Core Design Principles

1. **Runtime-first**: All fragment composition and query building happens at runtime, not compile-time
2. **Full type safety**: Model types flow through query builder → fragment → accessors with complete inference
3. **Backend agnostic**: Works with GraphQL, REST, tRPC, or any data source via adapter pattern
4. **Optimistic by default**: All mutations are optimistic with automatic rollback on errors
5. **Declarative mutations**: Components declare data dependencies; framework handles persistence
6. **Two-way binding**: Read and write through the same accessor API
7. **Composable fragments**: Components export fragments that parent components compose
8. **No magic strings**: Use proxy-based query builder instead of dot-separated field paths

## Component Layers

The framework supports three distinct component types:

### 1. Leaf Components (Model-Unaware)
- Accept `FieldAccessor<T>` or `EntityAccessor<T, TFields>` as props
- No knowledge of data model or backend
- Pure presentation components
- Example: A Map component that takes lat/lng field accessors

### 2. Fragment Components (Model-Aware)
- Know about model structure but not how to fetch it
- Export a fragment definition using `ModelProxy<T>`
- Receive matching accessors in props
- Example: ArticleMap component that knows Article has location.lat and location.lng

### 3. Entity Components (Query Definers)
- Define what to fetch from backend using `useEntity` hook
- Compose fragments from child components
- Manage persistence lifecycle
- Example: ArticleEdit component that loads Article and includes ArticleMap fragment

## Core Primitives to Implement

### FieldAccessor
Represents a single mutable field value. Should have:
- Current value and initial value
- Methods to update the value
- Validation errors and touched state
- Dirty tracking
- Helper props for input binding

### EntityAccessor
Represents a structured object with multiple fields. Should have:
- Map of field names to their accessors
- Entity ID
- Methods for persistence (save, delete, reset)
- Overall dirty/valid/loading state
- Aggregate errors from all fields
- Read-only data snapshot

### EntityListAccessor
Represents a collection of entities (for has-many relations). Should have:
- Array of items, each with stable key and entity accessor
- Methods to add/remove/reorder items
- Overall state tracking
- Each item should have shortcut to its fields and remove method

### RelationAccessor
Represents a has-one relationship (may be null). Should have:
- Reference to related entity (if exists)
- Methods to connect/disconnect/create related entities
- Loading state

### Fragment
Declarative definition of data dependencies. Should:
- Accept a function that receives ModelProxy and returns shape
- Track metadata about what fields/relations it depends on
- Be composable with other fragments
- Enable type inference from definition to usage

### ModelProxy
Type-safe query builder using Proxy pattern. Should:
- Track property access paths without dot-separated strings
- Distinguish between scalar fields, nested objects, and relations
- Build a dependency tree for query generation
- Provide full TypeScript type inference
- Handle has-many with map-like syntax
- Handle nested field access through object properties

## Key Implementation Challenges

### 1. ModelProxy Implementation
The foundation of type safety. Must:
- Use JavaScript Proxy to intercept property access
- Build internal representation of accessed paths
- Differentiate between field selection and traversal
- Maintain type information through all transformations
- Handle arrays/relations specially

Example usage that must work:
```tsx
const proxy = createModelProxy<Article>()
proxy.title                    // Select scalar field
proxy.location.lat             // Select nested field  
proxy.author.name              // Select through has-one relation
proxy.tags.map(tag => ({       // Select through has-many relation
  name: tag.name
}))
```

### 2. Fragment Composition
Fragments must merge cleanly:
- Child fragments automatically included in parent queries
- No conflicts when same field selected multiple times
- Nested fragments should compose recursively
- Type inference must flow from fragment → accessor props
- Runtime merging of dependency trees

### 3. Optimistic Updates
All mutations optimistic by default:
- setValue() calls update immediately
- Changes tracked separately from server state
- persist() sends to backend
- On error, automatic rollback
- Track pending/committed/error states per entity

### 4. Type Inference Flow
Critical that types flow automatically:
```
Model Type (Article)
  ↓
ModelProxy<Article> (in fragment definition)
  ↓
Fragment Result Type (inferred from what proxy touched)
  ↓
Accessor Types (FieldAccessor, EntityAccessor, etc.)
  ↓
Component Props (fully typed, no manual annotations needed)
```

### 5. Validation Integration
Support both client and server validation:
- Client-side validation hooks (Zod integration?)
- Server errors mapped to correct field paths
- Aggregate errors at entity and field level
- Clear error state management

## API Examples to Support

### Basic Usage
```tsx
const article = useEntity('Article', { id }, (entity) => ({
  title: entity.title,
  content: entity.content,
}))

<input {...article.fields.title.inputProps} />
await article.persist()
```

### Fragment Composition
```tsx
const AuthorFields = defineFragment((author: ModelProxy<Author>) => ({
  name: author.name,
  email: author.email,
}))

const article = useEntity('Article', { id }, (entity) => ({
  title: entity.title,
  author: AuthorFields.fragment(entity.author),
}))

<AuthorComponent fields={article.fields.author} />
```

### Collections
```tsx
const article = useEntity('Article', { id }, (entity) => ({
  tags: entity.tags.map(tag => ({
    name: tag.name,
  })),
}))

{article.fields.tags.items.map(item => (
  <input key={item.key} {...item.fields.name.inputProps} />
))}
article.fields.tags.add({ name: '' })
```

### Nested Components
```tsx
// MapComponent is leaf - just needs field refs
const Map = ({ lat, lng }: { lat: FieldAccessor<number>, lng: FieldAccessor<number> }) => {
  return <div>Lat: {lat.value}, Lng: {lng.value}</div>
}

// ArticleMap is fragment component - knows model structure
const ArticleMap = defineFragment((article: ModelProxy<Article>) => ({
  lat: article.location.lat,
  lng: article.location.lng,
}))

// Parent composes fragments
const article = useEntity('Article', { id }, (entity) => ({
  map: ArticleMap.fragment(entity),
}))

<Map lat={article.fields.map.lat} lng={article.fields.map.lng} />
```

## Backend Adapter Interface

Must support pluggable backends. Needs methods for:
- Fetching single entity by ID with query specification
- Fetching multiple entities with filters
- Persisting changes (create/update with change tracking)
- Deleting entities
- Optional: Real-time subscriptions for live updates

The query specification format is up to you - could be a tree structure, GraphQL-like, or other representation.

## Open Design Decisions

You need to decide and implement:

1. **Nested object handling**: How to represent `location: { lat, lng }` - single accessor vs nested structure?

2. **Query tree representation**: Internal format for representing what data was requested via ModelProxy

3. **Change tracking**: How to diff current state vs initial state for minimal update payloads

4. **Loading states**: Per-field, per-entity, or other granularity?

5. **Cache strategy**: Build in normalization or integrate with existing solutions?

6. **Error recovery**: How users can retry failed operations or handle validation errors

7. **Conditional fragments**: Support for fragments that may not always be included?

8. **Auto-persistence**: Should there be auto-save modes with debouncing?

## Success Criteria

- Complete type safety from model → proxy → accessors → props (no `any`)
- Fragment composition works seamlessly with type inference
- If fragment declares dependency, data is guaranteed at runtime (no undefined)
- Optimistic updates with automatic rollback on errors
- Works with at least two different backends (e.g., GraphQL + REST)
- Clear error messages when fragments don't compose
- No unnecessary re-renders
- Minimal boilerplate for users

## Implementation Approach

Start with:
1. **ModelProxy** - This is the foundation for type safety
2. **Fragment definition and metadata extraction** - Need to analyze what ModelProxy touches
3. **Basic FieldAccessor** - Simple reactive primitive
4. **EntityAccessor** - Composition of FieldAccessors
5. **Backend adapter interface** - Define contract
6. **useEntity hook** - Ties it all together
7. **EntityListAccessor** - For collections
8. **Fragment composition logic** - Merging dependencies
9. **Example implementation** - Prove it works end-to-end

Focus on getting the core type inference working first, then add features like optimistic updates, validation, etc.

## Deliverables

1. Core implementation of primitives (FieldAccessor, EntityAccessor, etc.)
2. ModelProxy with full type inference
3. Fragment system with composition
4. At least one backend adapter implementation
5. Working example showing all three component layers
6. Basic test coverage
7. Brief documentation of key concepts

The goal is a proof-of-concept that demonstrates the approach is viable and type-safe.
```
