# Bindx Test Architecture - Analýza a Doporučení

## Současný Stav

### Lokace testů

```
bindx/
├── tests/                           # Root integrační testy (~26 souborů)
│   ├── setup.ts                     # Happy-DOM setup
│   ├── useEntity.test.tsx           # 1473 řádků - monolitický
│   ├── cases/
│   │   ├── hasOne.test.tsx          # 1367 řádků
│   │   ├── hasMany.test.tsx
│   │   ├── fieldMutations.test.tsx
│   │   ├── entityCreateMode.test.tsx
│   │   └── useEntityList.test.tsx
│   ├── persistence/
│   │   ├── batchPersister.test.ts
│   │   ├── fieldPersistence.test.ts
│   │   ├── deduplication.test.ts
│   │   ├── errors.test.ts
│   │   ├── dependencies.test.ts
│   │   ├── pessimistic.test.ts
│   │   └── rollback.test.ts
│   ├── errors/
│   │   ├── errorClassification.test.ts
│   │   └── pathMapper.test.ts
│   ├── repeater/
│   │   └── repeater.test.tsx
│   ├── roles.test.tsx
│   ├── events.test.tsx
│   ├── undo.test.ts
│   ├── createComponent.test.tsx
│   ├── identityMapSync.test.tsx
│   ├── typedQueries.test.ts
│   ├── queryBuilding.test.ts
│   ├── mutationCollector.test.ts
│   ├── interoperability.test.ts
│   └── typeSafety.test.ts
│
├── packages/
│   ├── bindx/src/                   # ⚠️ ŽÁDNÉ UNIT TESTY
│   ├── bindx-react/src/             # ⚠️ ŽÁDNÉ UNIT TESTY
│   │
│   ├── bindx-form/tests/            # 6 souborů
│   │   ├── testUtils.tsx            # Duplikovaný setup
│   │   ├── formInputs.test.tsx
│   │   ├── formFieldState.test.tsx
│   │   ├── formDecorators.test.tsx
│   │   ├── formRelations.test.tsx
│   │   ├── integration.test.tsx
│   │   └── typeSafety.test.ts
│   │
│   ├── bindx-uploader/tests/        # 7 souborů
│   │   ├── setup.ts                 # Vlastní setup
│   │   ├── components.test.tsx
│   │   ├── dropzone.test.tsx
│   │   ├── attrAccept.test.ts
│   │   ├── extractors.test.ts
│   │   ├── fileTypes.test.ts
│   │   └── selection.test.ts
│   │
│   └── bindx-generator/tests/       # 1 soubor
│       └── generator.test.ts        # 450 řádků - všechno v jednom
```

---

## Identifikované Problémy

### 1. Roztříštěná Organizace

| Problém | Popis |
|---------|-------|
| **Smíšené vrstvy** | Root `tests/` obsahuje mix unit testů (SnapshotStore) a integračních testů (useEntity + React) |
| **Nekonzistentní umístění** | Testy pro `@contember/bindx` a `@contember/bindx-react` jsou v root, ne u zdrojového kódu |
| **Duplikované utility** | Každý balíček má vlastní `testUtils.tsx` s téměř identickým kódem |

### 2. Monolitické Soubory

| Soubor | Řádků | Problém |
|--------|-------|---------|
| `useEntity.test.tsx` | 1473 | Testuje loading, rendering, mutations, dirty state, reset, persist, relations - mělo by být rozděleno |
| `hasOne.test.tsx` | 1367 | 19 test cases v jednom souboru |
| `generator.test.ts` | 450 | Testuje 6 generátorů najednou |

### 3. Duplikace Mock Dat a Helperů

Následující kód se opakuje v prakticky **každém** testovacím souboru:

```typescript
// Opakuje se 10+ krát
interface Article { id: string; title: string; ... }
interface Author { id: string; name: string; ... }

const schema = defineSchema<TestSchema>({
  entities: {
    Article: { fields: { ... } },
    Author: { fields: { ... } },
  },
})

function createMockData() {
  return {
    Article: { 'article-1': { ... } },
    Author: { 'author-1': { ... } },
  }
}

function getByTestId(container, testId) { ... }
function queryByTestId(container, testId) { ... }
```

### 4. Chybějící Unit Testy pro Core

Balíčky `@contember/bindx` a `@contember/bindx-react` nemají žádné izolované unit testy pro své moduly:

| Modul | Status |
|-------|--------|
| `SnapshotStore` | ⚠️ Testováno jen nepřímo přes integrační testy |
| `ActionDispatcher` | ⚠️ Nepřímé testy |
| `EventEmitter` | ⚠️ Jen `events.test.tsx` v rootu |
| `EntityHandle/FieldHandle` | ⚠️ Nepřímé testy |
| `cond` helpers | ❌ Chybí |
| `If/HasMany/HasOne` komponenty | ⚠️ Jen integrační testy |
| `usePersist` hook | ⚠️ Testováno jen přes `useEntity().persist()` |

### 5. Nejednotné Pojmenování

```
tests/cases/hasOne.test.tsx       # "cases" složka
tests/persistence/...              # "persistence" složka
tests/errors/...                   # "errors" složka
tests/useEntity.test.tsx           # přímo v root
tests/roles.test.tsx               # přímo v root
```

---

## Co Ponechat (✅)

| Soubor/Oblast | Důvod |
|---------------|-------|
| `tests/persistence/*.test.ts` | Dobře strukturované, izolované unit testy pro persistence layer |
| `tests/errors/*.test.ts` | Čisté unit testy pro error handling |
| `packages/bindx-uploader/tests/` | Dobře rozdělené, každý aspekt má svůj soubor |
| `packages/bindx-form/tests/typeSafety.test.ts` | Unikátní type-level testy |

---

## Co Rozdělit (🔄)

### `tests/useEntity.test.tsx` → 6 souborů

```
tests/react/
├── useEntity/
│   ├── loading.test.tsx          # loading state testy
│   ├── rendering.test.tsx        # scalar a relation rendering
│   ├── mutations.test.tsx        # setValue, optimistic updates
│   ├── dirtyState.test.tsx       # isDirty, serverValue tracking
│   ├── reset.test.tsx            # reset functionality
│   └── persist.test.tsx          # persist functionality
```

### `tests/cases/hasOne.test.tsx` → 4 soubory

```
tests/react/relations/hasOne/
├── connect.test.tsx              # connect operace
├── disconnect.test.tsx           # disconnect operace
├── reset.test.tsx                # reset operace
├── dirtyState.test.tsx           # dirty tracking
└── persist.test.tsx              # persistence
```

### `packages/bindx-generator/tests/generator.test.ts` → 4 soubory

```
packages/bindx-generator/tests/
├── enumGenerator.test.ts
├── entityGenerator.test.ts
├── roleGenerator.test.ts
└── integration.test.ts           # full generate() function
```

---

## Co Přepsat (🔁)

### Sdílené Test Utilities

Vytvořit centrální `@contember/bindx-test-utils` balíček nebo `tests/shared/`:

```typescript
// tests/shared/schema.ts
export interface Article { id: string; title: string; content: string; author: Author | null; tags: Tag[] }
export interface Author { id: string; name: string; email: string }
export interface Tag { id: string; name: string; color: string }

export const testSchema = defineSchema<TestSchema>({ ... })
export const { useEntity, useEntityList } = createBindx(testSchema)

// tests/shared/mockData.ts
export function createArticleMockData(): MockDataStore { ... }
export function createAuthorMockData(): MockDataStore { ... }

// tests/shared/helpers.ts
export { getByTestId, queryByTestId, getAllByTestId } from './helpers'
export { createMockAdapter } from './adapters'
export { renderWithBindx } from './render'

// tests/shared/render.tsx
export function renderWithBindx(
  ui: ReactElement,
  options?: { adapter?: BackendAdapter; mockData?: MockDataStore }
) {
  const adapter = options?.adapter ?? new MockAdapter(options?.mockData ?? createArticleMockData())
  return render(
    <BindxProvider adapter={adapter}>
      {ui}
    </BindxProvider>
  )
}
```

### Přeorganizovat Root Tests

```
tests/
├── shared/                        # Sdílené utility
│   ├── schema.ts
│   ├── mockData.ts
│   ├── helpers.ts
│   ├── render.tsx
│   └── index.ts
│
├── unit/                          # Izolované unit testy
│   ├── store/
│   │   ├── snapshotStore.test.ts
│   │   └── actionDispatcher.test.ts
│   ├── persistence/
│   │   ├── batchPersister.test.ts
│   │   ├── changeRegistry.test.ts
│   │   └── ...
│   ├── errors/
│   │   ├── classification.test.ts
│   │   └── pathMapper.test.ts
│   ├── events/
│   │   └── eventEmitter.test.ts
│   └── undo/
│       └── undoManager.test.ts
│
├── react/                         # React integrační testy
│   ├── hooks/
│   │   ├── useEntity/
│   │   │   ├── loading.test.tsx
│   │   │   ├── rendering.test.tsx
│   │   │   └── ...
│   │   ├── useEntityList/
│   │   │   └── ...
│   │   ├── usePersist.test.tsx
│   │   └── useUndo.test.tsx
│   ├── components/
│   │   ├── Field.test.tsx
│   │   ├── If.test.tsx
│   │   ├── HasMany.test.tsx
│   │   └── HasOne.test.tsx
│   ├── relations/
│   │   ├── hasOne/
│   │   │   └── ...
│   │   └── hasMany/
│   │       └── ...
│   └── roles/
│       └── hasRole.test.tsx
│
├── integration/                   # End-to-end scénáře
│   ├── fullFormCycle.test.tsx    # Load → Edit → Persist
│   ├── multiEntityEdit.test.tsx
│   └── errorRecovery.test.tsx
│
└── types/                         # Compile-time type testy
    └── typeSafety.test.ts
```

---

## Co Doplnit (➕)

### Priorita 1: Chybějící Unit Testy pro Core

```typescript
// packages/bindx/tests/store/snapshotStore.test.ts
describe('SnapshotStore', () => {
  describe('setEntityData', () => { ... })
  describe('setFieldValue', () => { ... })
  describe('getDirtyFields', () => { ... })
  describe('createEntity', () => { ... })
  describe('deleteEntity', () => { ... })
})

// packages/bindx/tests/handles/fieldHandle.test.ts
describe('FieldHandle', () => {
  describe('value', () => { ... })
  describe('setValue', () => { ... })
  describe('serverValue', () => { ... })
  describe('isDirty', () => { ... })
  describe('reset', () => { ... })
  describe('addError/clearErrors', () => { ... })
})

// packages/bindx/tests/handles/hasOneHandle.test.ts
describe('HasOneHandle', () => {
  describe('$id', () => { ... })
  describe('$connect', () => { ... })
  describe('$disconnect', () => { ... })
  describe('$isDirty', () => { ... })
  describe('$reset', () => { ... })
  describe('$entity', () => { ... })
})

// packages/bindx/tests/handles/hasManyHandle.test.ts
describe('HasManyListHandle', () => {
  describe('items', () => { ... })
  describe('length', () => { ... })
  describe('connect', () => { ... })
  describe('disconnect', () => { ... })
  describe('isDirty', () => { ... })
  describe('map', () => { ... })
})
```

### Priorita 2: Chybějící React Komponenty

```typescript
// packages/bindx-react/tests/components/If.test.tsx
describe('If component', () => {
  describe('cond.isNotNull', () => { ... })
  describe('cond.hasItems', () => { ... })
  describe('cond.isTruthy', () => { ... })
  describe('cond.isEmpty', () => { ... })
  describe('cond.equals', () => { ... })
  describe('nested conditions', () => { ... })
})

// packages/bindx-react/tests/components/Field.test.tsx
describe('Field component', () => {
  describe('rendering scalar value', () => { ... })
  describe('format prop', () => { ... })
  describe('null value handling', () => { ... })
})

// packages/bindx-react/tests/components/HasMany.test.tsx
describe('HasMany component', () => {
  describe('iterating over items', () => { ... })
  describe('orderBy', () => { ... })
  describe('filter', () => { ... })
  describe('empty state', () => { ... })
})
```

### Priorita 3: Edge Cases a Error Handling

```typescript
// tests/react/errorHandling/
├── loadingErrors.test.tsx         # Network errors, timeouts
├── persistErrors.test.tsx         # Validation errors, conflicts
├── optimisticRollback.test.tsx    # Rollback on persist failure
└── errorBoundaries.test.tsx       # React error boundaries

// tests/react/edgeCases/
├── nullableFields.test.tsx
├── circularRelations.test.tsx
├── deepNesting.test.tsx
├── largeDatasets.test.tsx
└── concurrentMutations.test.tsx
```

### Priorita 4: Hooks

```typescript
// packages/bindx-react/tests/hooks/usePersist.test.tsx
describe('usePersist', () => {
  describe('persistAll', () => { ... })
  describe('persistFields', () => { ... })
  describe('persistEntity', () => { ... })
  describe('error handling', () => { ... })
})

// packages/bindx-react/tests/hooks/useUndo.test.tsx
describe('useUndo', () => {
  describe('undo', () => { ... })
  describe('redo', () => { ... })
  describe('canUndo/canRedo', () => { ... })
  describe('batching', () => { ... })
})

// packages/bindx-react/tests/hooks/useEntityErrors.test.tsx
describe('useEntityErrors', () => {
  describe('field errors', () => { ... })
  describe('entity errors', () => { ... })
  describe('clearing errors', () => { ... })
})
```

---

## Navrhovaná Testovací Konvence

### Pojmenování Souborů

```
<module>.test.ts       # Unit testy (bez React)
<component>.test.tsx   # React komponenty
<feature>.test.tsx     # Integrační testy
```

### Struktura Testu

```typescript
describe('<ModuleName>', () => {
  // Shared setup
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

### Pojmenování Testů

```typescript
// ✅ Dobře
test('should return null when entity does not exist')
test('should mark field as dirty after setValue')
test('should throw when called outside provider')

// ❌ Špatně
test('works correctly')
test('test case 1')
test('handles edge case')
```

---

## Migrační Plán

### Fáze 1: Sdílené Utility (1-2 dny)

1. Vytvořit `tests/shared/` s centrálními utilitami
2. Refaktorovat existující testy aby je používaly
3. Odstranit duplikovaný kód z jednotlivých souborů

### Fáze 2: Reorganizace Adresářů (2-3 dny)

1. Přesunout testy do nové struktury (`unit/`, `react/`, `integration/`)
2. Rozdělit monolitické soubory
3. Aktualizovat importy

### Fáze 3: Doplnění Chybějících Testů (průběžně)

1. Unit testy pro `@contember/bindx` core
2. Testy pro React komponenty (`If`, `Field`, `HasMany`)
3. Hook testy (`usePersist`, `useUndo`)
4. Edge case a error handling testy

### Fáze 4: CI/CD Integrace

1. Nastavit coverage reporting
2. Definovat minimální coverage thresholds
3. Přidat pre-commit hooks pro spuštění testů

---

## Coverage Cíle

| Oblast | Aktuální | Cíl |
|--------|----------|-----|
| `@contember/bindx` | ~40% (odhad) | 80%+ |
| `@contember/bindx-react` | ~50% (odhad) | 80%+ |
| `@contember/bindx-form` | ~70% | 85%+ |
| `@contember/bindx-uploader` | ~75% | 85%+ |
| `@contember/bindx-generator` | ~60% | 80%+ |

---

## Závěr

Současné testy jsou funkční, ale trpí organizačními problémy:

1. **Hlavní pozitiva**: Existuje solidní základ integračních testů, persistence layer je dobře otestovaný
2. **Hlavní problémy**: Duplikace kódu, monolitické soubory, chybějící unit testy pro core moduly
3. **Doporučení**: Začít s konsolidací sdílených utilit, postupně rozdělovat velké soubory, doplňovat unit testy pro core
