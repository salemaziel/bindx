# Bindx Usage Guide

A type-safe React data binding framework for managing entity data with automatic field selection and persistence.

## Setup

### 1. Define Schema

```typescript
import { defineSchema, scalar, hasOne, hasMany } from '@contember/bindx'

interface Author {
  id: string
  name: string
  email: string
}

interface Article {
  id: string
  title: string
  content: string
  author: Author
  tags: Tag[]
}

const schema = defineSchema<{ Article: Article; Author: Author }>({
  entities: {
    Article: {
      fields: {
        id: scalar(),
        title: scalar(),
        content: scalar(),
        author: hasOne('Author'),
        tags: hasMany('Tag'),
      }
    },
    Author: {
      fields: {
        id: scalar(),
        name: scalar(),
        email: scalar(),
      }
    }
  }
})

export const { useEntity, useEntityList, Entity } = createBindx(schema)
```

### 2. Wrap App with Provider

```tsx
import { BindxProvider, MockAdapter } from '@contember/bindx'

function App() {
  const adapter = new MockAdapter(initialData)

  return (
    <BindxProvider adapter={adapter}>
      <YourApp />
    </BindxProvider>
  )
}
```

---

## JSX Components

### Entity

Root component that fetches an entity and provides it to children.

```tsx
<Entity name="Article" id="article-1" loading={<Spinner />}>
  {article => (
    <div>
      <Field field={article.fields.title} />
    </div>
  )}
</Entity>
```

### Field

Renders a scalar field value.

```tsx
// Basic
<Field field={entity.fields.name} />

// Custom render
<Field field={entity.fields.email}>
  {field => <a href={`mailto:${field.value}`}>{field.value}</a>}
</Field>

// Format function
<Field field={entity.fields.createdAt} format={d => d?.toLocaleDateString()} />
```

### HasOne

Renders a has-one relation.

```tsx
<HasOne field={article.fields.author}>
  {author => (
    <div>
      <Field field={author.fields.name} />
      <Field field={author.fields.email} />
    </div>
  )}
</HasOne>
```

### HasMany

Renders a has-many relation as a list.

```tsx
<HasMany field={author.fields.articles} limit={10} orderBy={{ createdAt: 'desc' }}>
  {(article, index) => (
    <div key={article.id}>
      <Field field={article.fields.title} />
    </div>
  )}
</HasMany>
```

### If

Conditional rendering. Collects fields from both branches during collection phase.

```tsx
<If
  condition={article.fields.isPublished}
  then={<Field field={article.fields.publishedAt} />}
  else={<span>Draft</span>}
/>
```

### Show

Renders content only if field has a value.

```tsx
<Show field={article.fields.publishedAt} fallback={<span>Not published</span>}>
  {date => <time>{date.toISOString()}</time>}
</Show>
```

---

## Hooks

### useEntity

Fetch a single entity with type-safe field selection.

```tsx
const article = useEntity('Article', { id: 'article-1' }, e =>
  e.id().title().content()
   .author(a => a.name().email())
)

if (article.status === 'loading') return <Spinner />
if (article.status === 'error') return <Error message={article.error.message} />

// Ready state
const { fields, data, isDirty } = article

// Read values
console.log(fields.title.value)
console.log(data.author.name)

// Update values
fields.title.setValue('New Title')

// Persist changes
await article.persist()

// Reset to server state
article.reset()
```

**Return type:**
- `status`: `'loading' | 'error' | 'ready'`
- `isLoading`, `isError`: boolean helpers
- `fields`: Field handles for reading/writing
- `data`: Read-only data object
- `isDirty`: Whether there are unsaved changes
- `persist()`: Save changes to backend
- `reset()`: Discard changes

### useEntityList

Fetch a list of entities.

```tsx
const articles = useEntityList('Article', {
  filter: { isPublished: true },
  orderBy: { createdAt: 'desc' },
  limit: 10
}, e => e.id().title().author(a => a.name()))

if (articles.status === 'ready') {
  articles.items.map(article => (
    <div key={article.id}>{article.data.title}</div>
  ))
}
```

---

## Field Handles

Field handles provide reactive access to field values.

```tsx
const article = useEntity('Article', { id }, e => e.title().content())

if (article.status === 'ready') {
  const { fields } = article

  // Read
  fields.title.value        // current value
  fields.title.serverValue  // original server value
  fields.title.isDirty      // has local changes

  // Write
  fields.title.setValue('New value')

  // Form integration
  <input {...fields.title.inputProps} />
  // equivalent to:
  <input
    value={fields.title.value ?? ''}
    onChange={e => fields.title.setValue(e.target.value)}
  />
}
```

---

## Reusable Components

Create reusable components that declare their data requirements using `createComponent`.

### Implicit Mode (auto-collection from JSX)

The simplest approach - field dependencies are automatically collected from JSX:

```tsx
import { createComponent, Field, HasOne, type EntityRef } from '@contember/bindx'

interface AuthorBadgeProps {
  author: EntityRef<Author, { name: string; avatar: string }>
}

export const AuthorBadge = createComponent<AuthorBadgeProps>(({ author }) => (
  <div className="author-badge">
    <Field field={author.fields.name} />
    <Field field={author.fields.avatar} />
  </div>
))

// Use with useEntity - fragment selection is automatically included
const article = useEntity('Article', { id }, e =>
  e.id().title().author(AuthorBadge.$author)
)

// Use in JSX
<HasOne field={article.fields.author}>
  {author => <AuthorBadge author={author} />}
</HasOne>
```

### Explicit Mode (for complex components)

For components with conditional rendering, custom hooks, or where you want explicit data dependency documentation:

```tsx
import { createComponent, type SelectionBuilder } from '@contember/bindx'

// Without scalar props
const AuthorCard = createComponent({
  selection: {
    author: (e: SelectionBuilder<Author>) => e.name().email().bio(),
  }
}, ({ author }) => (
  <div className="author-card">
    <h3>{author.data?.name}</h3>
    <p>{author.data?.bio}</p>
    <a href={`mailto:${author.data?.email}`}>Contact</a>
  </div>
))

// With scalar props - use builder pattern
interface CardOptions {
  showEmail?: boolean
  className?: string
}

const AuthorCardWithOptions = createComponent<CardOptions>()({
  selection: {
    author: (e: SelectionBuilder<Author>) => e.name().email().bio(),
  }
}, ({ author, showEmail, className }) => (
  <div className={className}>
    <h3>{author.data?.name}</h3>
    {showEmail && <a href={`mailto:${author.data?.email}`}>Contact</a>}
  </div>
))

// Use the fragment in hooks
const article = useEntity('Article', { id }, e =>
  e.title().author(AuthorCard.$author)
)

// Call with props
<AuthorCardWithOptions author={authorRef} showEmail className="my-card" />
```

### Fragment Merging

Combine fragments from multiple components:

```tsx
import { mergeFragments } from '@contember/bindx'

// Merge multiple fragments for the same entity
const article = useEntity('Article', { id }, e =>
  e.title().author(mergeFragments(AuthorBadge.$author, AuthorCard.$author))
)
```

---

## Context Hooks

Access bindx internals when needed.

```tsx
import {
  useBackendAdapter,
  useSnapshotStore,
  useDispatcher,
  usePersistence
} from '@contember/bindx'

function MyComponent() {
  const adapter = useBackendAdapter()  // Backend adapter instance
  const store = useSnapshotStore()     // Snapshot store
  const dispatch = useDispatcher()     // Action dispatcher
  const persistence = usePersistence() // Persistence manager
}
```

---

## How It Works

Bindx uses a two-phase rendering approach:

1. **Collection Phase**: Renders children with a proxy to detect which fields are accessed
2. **Loading Phase**: Fetches only the required fields from the backend
3. **Runtime Phase**: Renders children with real data

This means you only need to declare what you use - no manual query building required.

```tsx
// This JSX automatically generates a query for: id, title, author.name
<Entity name="Article" id={id}>
  {article => (
    <>
      <Field field={article.fields.title} />
      <HasOne field={article.fields.author}>
        {author => <Field field={author.fields.name} />}
      </HasOne>
    </>
  )}
</Entity>
```
