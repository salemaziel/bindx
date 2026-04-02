# Selection Collection Guide

Bindx automatically builds GraphQL queries from JSX. Components declare which fields they need via **selection collection** — a static analysis phase that runs before data fetching.

## How it works

When you render `<Entity>` or call `useEntity()`, bindx analyzes the component tree to discover which fields to fetch. It does this by walking the JSX tree and asking each component what fields it needs. There are two mechanisms a component can use to participate:

1. **`getSelection`** — component returns field metadata directly
2. **`staticRender`** (via `withCollector`) — component returns JSX that gets analyzed recursively

Most users never implement these directly. Instead, use `createComponent()` which handles everything automatically.

## EntityRef vs EntityAccessor

Bindx has a two-tier type system for entity references:

- **`EntityRef`** — a stable pointer. Has `id`, `$isDirty`, `$isNew`, and field access returning `FieldRef` (no `.value`). Safe to pass between components. Used in all public API surfaces (component props, children callbacks).
- **`EntityAccessor`** — extends `EntityRef` with live data access: `$data`, `$fields`, and field access returning `FieldAccessor` (with `.value`, `.isDirty`). Created by subscribing to the store.

**Rule of thumb**: components receive `EntityRef` as props. To access `.value`, either:
- Use `<Field>` / `<Attribute>` JSX components (they subscribe internally)
- Use `createComponent()` with explicit selection (render function gets `EntityAccessor`)
- Call `useAccessor(ref)` in a React component (subscribes and widens the type)

## JSX components

### `<Field>` — render a scalar value

```tsx
{/* Text output */}
<Field field={article.title} />

{/* Custom render — children receives FieldAccessor with .value */}
<Field field={article.email}>
  {email => <a href={`mailto:${email.value}`}>{email.value}</a>}
</Field>

{/* Format function */}
<Field field={article.publishedAt} format={d => d?.toLocaleDateString()} />
```

### `<Attribute>` — apply field value to element attributes

Use when you need a field value in `style`, `className`, `data-*`, or other HTML attributes. Like `<Field>` but for attributes instead of text content:

```tsx
<Attribute field={tag.color} format={color => ({ style: { backgroundColor: color.value ?? '#666' } })}>
  <span className="tag-badge">
    <Field field={tag.name} />
  </span>
</Attribute>
```

`format` receives `FieldAccessor` and returns a props object that gets spread onto the child element via `cloneElement`. The child must be a single React element.

**Important**: `<Attribute>` must wrap `<Field>`, not the other way around. During selection collection, only the outer component's `field` prop and children JSX tree are analyzed. A `<Field>` nested inside `<Attribute>`'s children is visible to the analyzer. But a `<Field>` wrapping `<Attribute>` in its children callback is not — the callback isn't executed during collection.

```tsx
{/* CORRECT — Attribute outer, Field inner */}
<Attribute field={tag.color} format={c => ({ style: { color: c.value } })}>
  <span><Field field={tag.name} /></span>
</Attribute>

{/* WRONG — Field inner's children are invisible during collection */}
<Field field={tag.name}>
  {name => (
    <Attribute field={tag.color} format={c => ({ style: { color: c.value } })}>
      <span>{name.value}</span>
    </Attribute>
  )}
</Field>
```

### `<HasMany>` — render a has-many relation

```tsx
<HasMany field={author.articles} limit={5} orderBy={{ publishedAt: 'desc' }}>
  {(article, index) => (
    <div key={article.id}>
      {index + 1}. <Field field={article.title} />
    </div>
  )}
</HasMany>
```

### `<HasOne>` — render a has-one relation

```tsx
<HasOne field={article.author}>
  {author => (
    <div>
      <Field field={author.name} /> (<Field field={author.email} />)
    </div>
  )}
</HasOne>
```

### `<Entity>` — root data boundary

```tsx
<Entity entity={schema.Article} by={{ id }} loading={<Spinner />}>
  {article => (
    <div>
      <Field field={article.title} />
      <HasOne field={article.author}>
        {author => <Field field={author.name} />}
      </HasOne>
    </div>
  )}
</Entity>
```

Children callback receives `EntityRef`. Use `<Field>`, `<Attribute>`, `<HasOne>`, `<HasMany>` inside for data access. The `Entity` component manages subscription — children re-render when data changes.

### `useAccessor` hook

Converts any `Ref` to its `Accessor` variant with store subscription. Use in your own React components when you need `.value` access outside of JSX components:

```tsx
import { useAccessor } from '@contember/bindx-react'

function AuthorBadge({ author }: { author: EntityRef<Author> }) {
  const acc = useAccessor(author)
  return <span title={acc.email.value ?? ''}>{acc.name.value}</span>
}
```

Also works with individual field refs via `useField`:

```tsx
import { useField } from '@contember/bindx-react'

function DirtyIndicator({ field }: { field: FieldRef<unknown> }) {
  const acc = useField(field)
  return acc.isDirty ? <span>*</span> : null
}
```

**Note**: `useAccessor`/`useField` are React hooks — they can only be called inside React components, not inside render callbacks like `HasMany` children. For render callbacks, use `<Field>` and `<Attribute>` instead.

## `createComponent()` — reusable components

### Implicit mode (recommended for JSX-heavy components)

Fields are auto-detected from JSX. Use `Field`, `HasOne`, `HasMany`, `Attribute` in your render function:

```tsx
export const AuthorInfo = createComponent()
  .entity('author', schema.Author)
  .render(({ author }) => (
    <div>
      <Field field={author.name} />
      <Field field={author.email} />
    </div>
  ))
```

How it works internally: the render function is called once with proxy props during analysis. Field accesses on the proxy are tracked automatically.

The render function receives `EntityRef` — use `<Field>` and `<Attribute>` for value access. Do not use `useAccessor` in implicit mode (it crashes during collection phase when the render function is called without React context).

### Explicit mode (for computed values and attributes)

Declare fields upfront via a selector. The render function receives `EntityAccessor` with direct `.value` access — no need for `<Field>` or `useAccessor`:

```tsx
export const TagBadge = createComponent()
  .entity('tag', schema.Tag, t => t.name().color())
  .render(({ tag }) => (
    <span style={{ backgroundColor: tag.color.value ?? '#666' }}>
      {tag.name.value}
    </span>
  ))
```

Use explicit mode when:
- You need field values in attributes (style, className, data-*)
- You have conditional field access (`if (x) entity.field`)
- You pass data to non-bindx libraries
- You want full `EntityAccessor` API (`.value`, `.$data`, `.isDirty`)

### Fragment properties

Both modes generate `$propName` fragment properties for composing with `useEntity`:

```tsx
const article = useEntity(schema.Article, { by: { id } }, e =>
  e.title().author(AuthorInfo.$author)
)
```

### When to use which mode

| Scenario | Mode | Render receives |
|---|---|---|
| Standard forms/views with Field, HasOne, HasMany | Implicit | `EntityRef` |
| Field values in HTML attributes | Explicit (or Attribute in implicit) | `EntityAccessor` |
| Conditional field access | Explicit | `EntityAccessor` |
| Passing data to non-bindx libs | Explicit | `EntityAccessor` |
| Quick prototyping | Implicit | `EntityRef` |

## For library/UI component developers

### `withCollector` — for components with render props

Use `withCollector` when your component wraps a relation and passes entity data via render prop (children callback). The analyzer can't see inside render props, so you provide a `staticRender` function that simulates the call:

```tsx
export const SelectField = withCollector(
  function SelectField({ field, children }) {
    // runtime implementation
    const accessor = useHasOne(field)
    return <Popover>{children(accessor.$entity)}</Popover>
  },
  // collection: simulate children call with proxy entity
  (props) => (
    <HasOne field={props.field}>
      {entity => props.children(entity)}
    </HasOne>
  )
)
```

The `staticRender` function receives the same props (with collector proxies during analysis). Return JSX that represents the field structure — it gets analyzed recursively. The returned JSX doesn't need to match runtime output, it just needs to express which fields are accessed.

Typical use cases:
- Repeaters (wrap HasMany, provide item render callback)
- Select fields (wrap HasOne, provide option render callback)
- Any component where children is `(entity) => ReactNode`

### `getSelection` — for leaf/framework components

Use `getSelection` when your component needs precise control over the `SelectionFieldMeta` it reports. This is a low-level API used by framework primitives:

```tsx
const MyField = memo(function MyField({ field }) {
  const accessor = useField(field)
  return <span>{accessor.value}</span>
})

;(MyField as any).getSelection = (props, collectNested) => {
  const meta = props.field[FIELD_REF_META]
  return {
    fieldName: meta.fieldName,
    path: meta.path,
    isRelation: false,
    isArray: false,
  }
}
```

Signature: `getSelection(props, collectNested) => SelectionFieldMeta | SelectionFieldMeta[] | null`

- `props` — component props (may contain collector proxies during analysis)
- `collectNested(jsx)` — call this to recursively analyze children JSX, returns `SelectionMeta`

Used by: `Field`, `HasOne`, `HasMany`, `Attribute`, `If`, `Show`, `Repeater`

You rarely need this unless building new framework-level primitives.

## Decision tree

```
Building a reusable component with entity props?
  → Use createComponent() (implicit or explicit mode)

Need field values in HTML attributes (style, className)?
  → Use <Attribute> in implicit mode, or explicit selection in createComponent

Need .value access in a standalone React component?
  → Use useAccessor() or useField() hooks

Building a library component that wraps a relation with render props?
  → Use withCollector()

Building a new framework primitive (like Field or HasOne)?
  → Implement getSelection directly
```
