/**
 * Error thrown when accessing a field that wasn't included in the GraphQL selection.
 * This helps debug field collection issues by clearly indicating which field is missing.
 */
export class UnfetchedFieldError extends Error {
	constructor(
		public readonly entityType: string,
		public readonly entityId: string,
		public readonly fieldPath: string[],
	) {
		const pathStr = fieldPath.join('.')
		super(
			`Accessing unfetched field "${pathStr}" on entity ${entityType}(${entityId}). ` +
			`This field was not included in the selection.`,
		)
		this.name = 'UnfetchedFieldError'
	}
}
