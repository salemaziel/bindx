import React from 'react'
import { useUndo, useEntity } from '@contember/bindx-react'
import { schema } from '../generated/index.js'
import { InputField, TextareaField, Button } from '@contember/bindx-ui'

/**
 * Demo component showcasing undo/redo functionality.
 */
export function UndoDemo({ id }: { id: string }): React.ReactElement {
	const { canUndo, canRedo, undo, redo, undoCount, redoCount, beginGroup, endGroup } = useUndo()

	const article = useEntity(schema.Article, { by: { id } }, e => e.id().title().content())

	if (article.$isLoading) {
		return <div className="loading">Loading...</div>
	}

	if (article.$isError || article.$isNotFound) {
		return <div className="error">Error: {article.$error?.message ?? 'Not found'}</div>
	}

	const handleBulkUpdate = (): void => {
		const groupId = beginGroup('Bulk update')
		article.$fields.title.setValue('Bulk Updated Title')
		article.$fields.content.setValue('Bulk Updated Content - this is a single undo operation!')
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
					field={article.$fields.title}
					label="Title"
					inputProps={{ 'data-testid': 'undo-title-input' }}
				/>

				<TextareaField
					field={article.$fields.content}
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
				.undo-demo {
					padding: 1rem;
					border: 1px solid #ddd;
					border-radius: 8px;
				}
				.undo-toolbar {
					display: flex;
					gap: 0.5rem;
					margin-bottom: 1rem;
					padding-bottom: 1rem;
					border-bottom: 1px solid #eee;
				}
				.form-fields {
					display: flex;
					flex-direction: column;
					gap: 1rem;
				}
				.hint {
					margin-top: 1rem;
					padding: 0.75rem;
					background: #f5f5f5;
					border-radius: 4px;
					font-size: 0.9rem;
				}
				.hint p {
					margin: 0.5rem 0;
				}
			`}</style>
		</div>
	)
}
