/**
 * Tests for role schema generators
 */
import { describe, test, expect } from 'bun:test'
import { RoleSchemaGenerator, RoleNameSchemaGenerator } from '../src/index'
import { testModel, testAcl } from './shared'

describe('RoleSchemaGenerator', () => {
	test('generates role-filtered entity types', () => {
		const generator = new RoleSchemaGenerator()
		const code = generator.generate(testModel, testAcl)

		// Public role - limited access
		expect(code).toContain('export interface PublicPost {')
		expect(code).toContain('id: string')
		expect(code).toContain('title: string')

		// Extract PublicPost interface to check it specifically
		const publicPostMatch = code.match(/export interface PublicPost \{[\s\S]*?^\}/m)
		expect(publicPostMatch).toBeTruthy()
		// Public Post should NOT have content (only accessible to editor/admin)
		expect(publicPostMatch![0]).not.toContain('content:')

		// Public should have Tag but not Author
		expect(code).toContain('export interface PublicTag {')
		expect(code).not.toContain('export interface PublicAuthor {')

		// Editor role - more access
		expect(code).toContain('export interface EditorPost {')
		expect(code).toContain('export interface EditorAuthor {')
		expect(code).toContain('export interface EditorTag {')

		// Editor Post should have content
		const editorPostMatch = code.match(/export interface EditorPost \{[\s\S]*?^\}/m)
		expect(editorPostMatch).toBeTruthy()
		expect(editorPostMatch![0]).toContain('content:')

		// Admin role - full access including salary
		expect(code).toContain('export interface AdminAuthor {')
		// Admin should have salary field
		expect(code).toMatch(/AdminAuthor[\s\S]*?salary/)

		// RoleSchemas mapping
		expect(code).toContain('export type RoleSchemas = {')
		expect(code).toContain('public: PublicSchema')
		expect(code).toContain('editor: EditorSchema')
		expect(code).toContain('admin: AdminSchema')
	})

	test('filters out relations to inaccessible entities', () => {
		const generator = new RoleSchemaGenerator()
		const code = generator.generate(testModel, testAcl)

		// Public Post should NOT have author relation (Author not accessible)
		const publicPostMatch = code.match(/export interface PublicPost \{[\s\S]*?^\}/m)
		expect(publicPostMatch).toBeTruthy()
		expect(publicPostMatch![0]).not.toContain('author:')
	})
})

describe('RoleNameSchemaGenerator', () => {
	test('generates role-filtered name schemas', () => {
		const generator = new RoleNameSchemaGenerator()
		const schemas = generator.generate(testModel, testAcl)

		// Public role
		expect(schemas['public']?.entities['Post']).toBeDefined()
		expect(schemas['public']?.entities['Post']?.scalars).toContain('id')
		expect(schemas['public']?.entities['Post']?.scalars).toContain('title')
		expect(schemas['public']?.entities['Post']?.scalars).not.toContain('content')
		expect(schemas['public']?.entities['Author']).toBeUndefined()
		// Editor role
		expect(schemas['editor']?.entities['Author']).toBeDefined()
		expect(schemas['editor']?.entities['Author']?.scalars).toContain('email')
		expect(schemas['editor']?.entities['Author']?.scalars).not.toContain('salary')
		// Admin role
		expect(schemas['admin']?.entities['Author']?.scalars).toContain('salary')
	})
})
