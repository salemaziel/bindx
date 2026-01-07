import { describe, test, expect } from 'bun:test'
import { MockAdapter, buildQueryFromSelection, __internal } from '@contember/react-bindx'

const {
	FieldAccessorImpl,
	EntityAccessorImpl,
	EntityListAccessorImpl,
	IdentityMap,
	createSelectionBuilder,
	getSelectionMeta,
} = __internal

interface Author {
	id: string
	name: string
}

interface Tag {
	id: string
	name: string
	color: string
}

interface Location {
	id: string
	label: string
	lat: number
	lng: number
}

interface Article {
	id: string
	title: string
	author: Author
	location: Location
	tags: Tag[]
}

describe('FieldAccessorImpl', () => {
	function createFieldAccessor(initialValue: unknown) {
		const identityMap = new IdentityMap()
		const entityType = 'Test'
		const entityId = 'test-1'

		// Initialize entity in IdentityMap
		identityMap.getOrCreate(entityType, entityId, { field: initialValue })

		let changeCount = 0
		const onChange = () => {
			changeCount++
		}

		const accessor = new FieldAccessorImpl(
			identityMap,
			entityType,
			entityId,
			['field'],
			onChange,
		)

		return { accessor, identityMap, getChangeCount: () => changeCount }
	}

	test('should store initial value', () => {
		const { accessor } = createFieldAccessor('initial')

		expect(accessor.value).toBe('initial')
		expect(accessor.serverValue).toBe('initial')
		expect(accessor.isDirty).toBe(false)
	})

	test('setValue should update value and mark as dirty', () => {
		const { accessor, getChangeCount } = createFieldAccessor('initial')

		accessor.setValue('updated')

		expect(accessor.value).toBe('updated')
		expect(accessor.serverValue).toBe('initial')
		expect(accessor.isDirty).toBe(true)
		expect(getChangeCount()).toBe(1)
	})

	test('setValue to same value should not trigger onChange', () => {
		const { accessor, getChangeCount } = createFieldAccessor('value')

		accessor.setValue('value')

		expect(getChangeCount()).toBe(0)
	})

	test('commitChanges should update serverValue', () => {
		const { accessor } = createFieldAccessor('initial')

		accessor.setValue('updated')
		expect(accessor.isDirty).toBe(true)

		accessor.commitChanges()

		expect(accessor.value).toBe('updated')
		expect(accessor.serverValue).toBe('updated')
		expect(accessor.isDirty).toBe(false)
	})

	test('_resetToServerValue should reset value to serverValue', () => {
		const { accessor } = createFieldAccessor('initial')

		accessor.setValue('local')
		expect(accessor.value).toBe('local')

		accessor._resetToServerValue()

		expect(accessor.value).toBe('initial')
		expect(accessor.serverValue).toBe('initial')
		expect(accessor.isDirty).toBe(false)
	})

	test('inputProps should provide value and setValue', () => {
		const { accessor, getChangeCount } = createFieldAccessor('test')

		expect(accessor.inputProps.value).toBe('test')
		accessor.inputProps.setValue('new')
		expect(getChangeCount()).toBe(1)
		expect(accessor.value).toBe('new')
	})
})

describe('EntityAccessorImpl', () => {
	function createTestAccessor(data: { title: string }) {
		const mockData = { Article: { 'a-1': data } }
		const adapter = new MockAdapter(mockData, { delay: 0 })
		const identityMap = new IdentityMap()

		const builder = createSelectionBuilder<Article>()
		const resultBuilder = builder.title()
		const meta = getSelectionMeta(resultBuilder)

		let changeCount = 0
		const onChange = () => {
			changeCount++
		}

		const accessor = new EntityAccessorImpl(
			'a-1',
			'Article',
			meta,
			adapter,
			identityMap,
			data,
			onChange,
		)

		return { accessor, getChangeCount: () => changeCount }
	}

	test('should have correct id and initial state', () => {
		const { accessor } = createTestAccessor({ title: 'Test' })

		expect(accessor.id).toBe('a-1')
		expect(accessor.isLoading).toBe(false)
		expect(accessor.isPersisting).toBe(false)
		expect(accessor.isDirty).toBe(false)
	})

	test('fields should provide field accessors', () => {
		const { accessor } = createTestAccessor({ title: 'Test Title' })

		expect(accessor.fields.title).toBeDefined()
		expect(accessor.fields.title.value).toBe('Test Title')
	})

	test('data should return current values', () => {
		const { accessor } = createTestAccessor({ title: 'Original' })

		expect(accessor.data).toEqual({ title: 'Original' })

		accessor.fields.title.setValue('Updated')

		expect(accessor.data).toEqual({ title: 'Updated' })
	})

	test('isDirty should reflect field changes', () => {
		const { accessor } = createTestAccessor({ title: 'Original' })

		expect(accessor.isDirty).toBe(false)

		accessor.fields.title.setValue('Changed')

		expect(accessor.isDirty).toBe(true)

		accessor.fields.title.setValue('Original')

		expect(accessor.isDirty).toBe(false)
	})

	test('reset should revert to server values', () => {
		const { accessor } = createTestAccessor({ title: 'Original' })

		accessor.fields.title.setValue('Changed')
		expect(accessor.isDirty).toBe(true)

		accessor.reset()

		expect(accessor.fields.title.value).toBe('Original')
		expect(accessor.isDirty).toBe(false)
	})

	test('collectChanges should return only dirty fields', () => {
		const { accessor } = createTestAccessor({ title: 'Original' })

		accessor.fields.title.setValue('Changed')
		const changes = accessor.collectChanges()

		expect(changes).toEqual({ title: 'Changed' })
	})

	test('commitChanges should mark all fields as clean', () => {
		const { accessor } = createTestAccessor({ title: 'Original' })

		accessor.fields.title.setValue('Changed')
		expect(accessor.isDirty).toBe(true)

		accessor.commitChanges()

		expect(accessor.isDirty).toBe(false)
		expect(accessor.fields.title.serverValue).toBe('Changed')
	})

	test('persist should call adapter and commit changes', async () => {
		const mockData = { Article: { 'a-1': { id: 'a-1', title: 'Original' } } }
		const adapter = new MockAdapter(mockData, { delay: 0 })
		const identityMap = new IdentityMap()

		const builder = createSelectionBuilder<Article>()
		const resultBuilder = builder.title()
		const meta = getSelectionMeta(resultBuilder)

		const accessor = new EntityAccessorImpl(
			'a-1',
			'Article',
			meta,
			adapter,
			identityMap,
			{ title: 'Original' },
			() => {},
		)

		accessor.fields.title.setValue('Persisted')
		await accessor.persist()

		expect(accessor.isDirty).toBe(false)
		expect(accessor.fields.title.serverValue).toBe('Persisted')
		expect(mockData.Article['a-1']!.title).toBe('Persisted')
	})
})

describe('EntityListAccessorImpl', () => {
	function createTestListAccessor(data: { name: string }[]) {
		const adapter = new MockAdapter({ Tag: {} }, { delay: 0 })
		const identityMap = new IdentityMap()

		const builder = createSelectionBuilder<Tag>()
		const resultBuilder = builder.name()
		const meta = getSelectionMeta(resultBuilder)

		let changeCount = 0
		const onChange = () => {
			changeCount++
		}

		const accessor = new EntityListAccessorImpl(
			'Tag',
			meta,
			adapter,
			identityMap,
			data,
			onChange,
		)

		return { accessor, getChangeCount: () => changeCount }
	}

	test('should have correct initial items', () => {
		const { accessor } = createTestListAccessor([{ name: 'Tag1' }, { name: 'Tag2' }])

		expect(accessor.length).toBe(2)
		expect(accessor.items[0]?.fields.name.value).toBe('Tag1')
		expect(accessor.items[1]?.fields.name.value).toBe('Tag2')
	})

	test('items should have unique keys', () => {
		const { accessor } = createTestListAccessor([{ name: 'A' }, { name: 'B' }, { name: 'C' }])

		const keys = accessor.items.map(item => item.key)
		const uniqueKeys = new Set(keys)

		expect(uniqueKeys.size).toBe(3)
	})

	test('add should add new item', () => {
		const { accessor } = createTestListAccessor([{ name: 'Existing' }])

		accessor.add({ name: 'New' })

		expect(accessor.length).toBe(2)
		expect(accessor.items[1]?.fields.name.value).toBe('New')
		expect(accessor.isDirty).toBe(true)
	})

	test('remove should remove item by key', () => {
		const { accessor } = createTestListAccessor([{ name: 'A' }, { name: 'B' }])

		const keyToRemove = accessor.items[0]!.key
		accessor.remove(keyToRemove)

		expect(accessor.length).toBe(1)
		expect(accessor.items[0]?.fields.name.value).toBe('B')
		expect(accessor.isDirty).toBe(true)
	})

	test('item.remove should remove the item', () => {
		const { accessor } = createTestListAccessor([{ name: 'A' }, { name: 'B' }])

		accessor.items[0]!.remove()

		expect(accessor.length).toBe(1)
		expect(accessor.items[0]?.fields.name.value).toBe('B')
	})

	test('move should reorder items', () => {
		const { accessor } = createTestListAccessor([{ name: 'A' }, { name: 'B' }, { name: 'C' }])

		accessor.move(0, 2)

		expect(accessor.items[0]?.fields.name.value).toBe('B')
		expect(accessor.items[1]?.fields.name.value).toBe('C')
		expect(accessor.items[2]?.fields.name.value).toBe('A')
		expect(accessor.isDirty).toBe(true)
	})

	test('isDirty should be true when items are modified', () => {
		const { accessor } = createTestListAccessor([{ name: 'Test' }])

		expect(accessor.isDirty).toBe(false)

		accessor.items[0]?.fields.name.setValue('Modified')

		expect(accessor.isDirty).toBe(true)
	})
})

describe('MockAdapter projection', () => {
	test('should project has-one relation data', async () => {
		const mockData = {
			Article: {
				'article-1': {
					id: 'article-1',
					title: 'Test',
					location: {
						id: 'location-1',
						label: 'New York',
						lat: 40.7128,
						lng: -74.006,
					},
				},
			},
		}

		const adapter = new MockAdapter(mockData, { delay: 0 })

		const builder = createSelectionBuilder<Article>()
		const result = builder.title().location(l => l.id().label().lat().lng())
		const meta = getSelectionMeta(result)
		const query = buildQueryFromSelection(meta)

		const data = await adapter.fetchOne('Article', 'article-1', query)

		expect(data['title']).toBe('Test')
		expect(data['location']).toBeDefined()
		expect((data['location'] as Location).label).toBe('New York')
		expect((data['location'] as Location).lat).toBe(40.7128)
	})

	test('should project has-many relation data', async () => {
		const mockData = {
			Article: {
				'article-1': {
					id: 'article-1',
					title: 'Test',
					tags: [
						{ id: 'tag-1', name: 'React', color: '#61dafb' },
						{ id: 'tag-2', name: 'JavaScript', color: '#f7df1e' },
					],
				},
			},
		}

		const adapter = new MockAdapter(mockData, { delay: 0 })

		const builder = createSelectionBuilder<Article>()
		const result = builder.title().tags(t => t.id().name().color())
		const meta = getSelectionMeta(result)
		const query = buildQueryFromSelection(meta)

		const data = await adapter.fetchOne('Article', 'article-1', query)

		expect(data['title']).toBe('Test')
		expect(data['tags']).toBeDefined()
		expect(Array.isArray(data['tags'])).toBe(true)
		expect((data['tags'] as Tag[]).length).toBe(2)
		expect((data['tags'] as Tag[])[0]?.name).toBe('React')
		expect((data['tags'] as Tag[])[1]?.name).toBe('JavaScript')
	})

	test('should project both has-one and has-many in same query', async () => {
		const mockData = {
			Article: {
				'article-1': {
					id: 'article-1',
					title: 'Test',
					location: {
						id: 'location-1',
						label: 'New York',
						lat: 40.7128,
						lng: -74.006,
					},
					tags: [
						{ id: 'tag-1', name: 'React', color: '#61dafb' },
						{ id: 'tag-2', name: 'JavaScript', color: '#f7df1e' },
					],
				},
			},
		}

		const adapter = new MockAdapter(mockData, { delay: 0 })

		const builder = createSelectionBuilder<Article>()
		const result = builder.title().location(l => l.id().label().lat().lng()).tags(t => t.id().name().color())
		const meta = getSelectionMeta(result)
		const query = buildQueryFromSelection(meta)

		const data = await adapter.fetchOne('Article', 'article-1', query)

		expect(data['title']).toBe('Test')
		expect(data['location']).toBeDefined()
		expect((data['location'] as Location).label).toBe('New York')
		expect(data['tags']).toBeDefined()
		expect((data['tags'] as Tag[]).length).toBe(2)
	})
})
