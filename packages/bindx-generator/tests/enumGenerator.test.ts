/**
 * Tests for enum type schema generator
 */
import { describe, test, expect } from 'bun:test'
import { EnumTypeSchemaGenerator } from '../src/index'
import { testModel } from './shared'

describe('EnumTypeSchemaGenerator', () => {
	test('generates enum types', () => {
		const generator = new EnumTypeSchemaGenerator()
		const code = generator.generate(testModel)

		expect(code).toContain("export type PostStatusEnum = 'draft' | 'published' | 'archived'")
		expect(code).toContain("export const PostStatusValues = ['draft', 'published', 'archived'] as const")
	})
})
