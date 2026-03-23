import type { ReactNode } from 'react'
import { Entity, useUndo } from '@contember/bindx-react'
import { InputField, TextareaField, Button } from '@contember/bindx-ui'
import { schema } from '../generated/index.js'

/**
 * Undo/Redo demo using Entity JSX + useUndo hook.
 *
 * Demonstrates:
 * - Entity component for data binding
 * - useUndo hook for undo/redo operations
 * - Grouped mutations with beginGroup/endGroup
 */
export function UndoPage({ id }: { id: string }): ReactNode {
	const { canUndo, canRedo, undo, redo, undoCount, redoCount, beginGroup, endGroup } = useUndo()

	return (
		<Entity
			entity={schema.Article}
			by={{ id }}
			loading={<div className="loading">Loading...</div>}
			notFound={<div className="error">Article not found</div>}
		>
			{article => {
				const handleBulkUpdate = (): void => {
					const groupId = beginGroup('Bulk update')
					article.title.setValue('Bulk Updated Title')
					article.content.setValue('Bulk Updated Content - this is a single undo operation!')
					endGroup(groupId)
				}

				return (
					<div className="undo-demo" data-testid="undo-demo">
						<div className="undo-toolbar">
							<Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" data-testid="undo-button">
								Undo ({undoCount})
							</Button>
							<Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" data-testid="redo-button">
								Redo ({redoCount})
							</Button>
							<Button variant="secondary" size="sm" onClick={handleBulkUpdate} data-testid="bulk-update-button">
								Bulk Update (grouped)
							</Button>
						</div>

						<div className="form-fields">
							<InputField
								field={article.title}
								label="Title"
								inputProps={{ 'data-testid': 'undo-title-input' }}
							/>
							<TextareaField
								field={article.content}
								label="Content"
								inputProps={{ 'data-testid': 'undo-content-input', rows: 4 }}
							/>
						</div>

						<div className="hint">
							<p>
								<strong>Try it:</strong> Edit the fields above and use Undo/Redo buttons.
								Changes are auto-grouped when typing rapidly (300ms debounce).
							</p>
							<p>
								<strong>Bulk Update:</strong> Uses beginGroup/endGroup to make multiple changes
								act as a single undo operation.
							</p>
						</div>

						<style>{`
							.undo-demo { padding: 1rem; border: 1px solid #ddd; border-radius: 8px; }
							.undo-toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
							.form-fields { display: flex; flex-direction: column; gap: 1rem; }
							.hint { margin-top: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px; font-size: 0.9rem; }
							.hint p { margin: 0.5rem 0; }
						`}</style>
					</div>
				)
			}}
		</Entity>
	)
}
