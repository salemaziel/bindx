/**
 * Integration tests for the full generator
 */
import { describe, test, expect } from 'bun:test'
import { BindxGenerator, generate } from '../src/index'
import { testModel, testAcl } from './shared'

describe('BindxGenerator', () => {
	test('generates files without ACL', () => {
		const generator = new BindxGenerator()
		const files = generator.generate(testModel)

		expect(files['entities.ts']).toBeDefined()
		expect(files['names.ts']).toBeDefined()
		expect(files['enums.ts']).toBeDefined()
		expect(files['types.ts']).toBeDefined()
		expect(files['index.ts']).toBeDefined()

		expect(files['index.ts']).toContain('createBindx')
		expect(files['index.ts']).toContain('useEntity')
	})

	test('generates files with role-based ACL', () => {
		const generator = new BindxGenerator()
		const files = generator.generateWithRoles(testModel, testAcl)

		expect(files['entities.ts']).toContain('RoleSchemas')
		expect(files['entities.ts']).toContain('PublicSchema')
		expect(files['entities.ts']).toContain('EditorSchema')
		expect(files['entities.ts']).toContain('AdminSchema')

		// names.ts is no longer generated for role-aware schemas
		expect(files['names.ts']).toBeUndefined()

		// index.ts uses createRoleAwareBindx for role-based schemas
		expect(files['index.ts']).toContain('createRoleAwareBindx')
		expect(files['index.ts']).toContain('createRoleAwareBindx<RoleSchemas>')
		expect(files['index.ts']).toContain('RoleAwareProvider')
		expect(files['index.ts']).toContain('HasRole')
	})
})

describe('generate function', () => {
	test('generates without ACL', () => {
		const files = generate(testModel)
		expect(files['entities.ts']).toContain('BindxSchema')
	})

	test('generates with ACL', () => {
		const files = generate(testModel, testAcl)
		expect(files['entities.ts']).toContain('RoleSchemas')
	})
})
