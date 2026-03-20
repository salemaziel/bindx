import { type ReactNode, useState, useEffect } from 'react'
import { ContemberBindxProvider } from '@contember/bindx-react'
import { GraphQlClient } from '@contember/graphql-client'
import { UploaderClientContext, S3UploadClient, createContentApiS3Signer } from '@contember/bindx-uploader'
import { schemaNames } from './generated/names.js'
import {
	ArticleEditor,
	ArticleView,
	AuthorListExample,
	TagListExample,
	ArticleWithAuthorSelectExample,
	LocationSelectExample,
	UndoDemo,
	RichTextEditorExample,
	BlockEditorExample,
	SimpleBlockEditorExample,
	DataGridExample,
	HasManyDataGridExample,
	HeadlessBlockRepeaterExample,
	StyledBlockRepeaterExample,
	DualModeBlockRepeaterExample,
} from './components/index.js'

const client = new GraphQlClient({
	url: `${import.meta.env['VITE_CONTEMBER_API_URL']}/content/example/live`,
	apiToken: import.meta.env['VITE_CONTEMBER_API_TOKEN'],
})

const s3Client = new S3UploadClient({
	// Cast needed: root and bindx-uploader may resolve @contember/graphql-client separately
	signUrl: createContentApiS3Signer(client as unknown as Parameters<typeof createContentApiS3Signer>[0]),
})

function AppProvider({ children }: { children: ReactNode }): ReactNode {
	return (
		<ContemberBindxProvider client={client} schema={schemaNames} undoManager={true} debug={true}>
			<UploaderClientContext value={s3Client}>
				{children}
			</UploaderClientContext>
		</ContemberBindxProvider>
	)
}

// ============================================================================
// Pages
// ============================================================================

const pages: Record<string, { title: string; description: string; content: ReactNode }> = {
	datagrid: {
		title: 'DataGrid',
		description: 'Data grid with filtering, sorting, and pagination.',
		content: <DataGridExample />,
	},
	undo: {
		title: 'Undo/Redo Demo',
		description: 'Edit fields and use Undo/Redo. Changes are auto-grouped when typing rapidly.',
		content: <UndoDemo id="00000000-0000-0000-0000-000000000e01" />,
	},
	editors: {
		title: 'Rich Text & Block Editors',
		description: 'Rich text editing with formatting and structured block editors.',
		content: (
			<>
				<h3>Rich Text Editor</h3>
				<RichTextEditorExample id="00000000-0000-0000-0000-000000000e01" />
				<hr className="my-6" />
				<h3>Block Editor (with references)</h3>
				<BlockEditorExample id="00000000-0000-0000-0000-000000000e01" />
				<hr className="my-6" />
				<h3>Block Editor (simple)</h3>
				<SimpleBlockEditorExample id="00000000-0000-0000-0000-000000000e02" />
			</>
		),
	},
	'article-editor': {
		title: 'Article Editor',
		description: 'Full article editor using reusable fragments for author, location, and tags.',
		content: <ArticleEditor id="00000000-0000-0000-0000-000000000e01" />,
	},
	'article-view': {
		title: 'Article View',
		description: 'Simple read-only view using inline fragment definition.',
		content: <ArticleView id="00000000-0000-0000-0000-000000000e02" />,
	},
	'entity-lists': {
		title: 'Entity Lists',
		description: 'Display entities from the database using useEntityList.',
		content: (
			<>
				<ArticleView id="00000000-0000-0000-0000-000000000e02" />
				<hr className="my-6" />
				<h3>Author List</h3>
				<AuthorListExample />
				<hr className="my-6" />
				<h3>Tag List</h3>
				<TagListExample />
			</>
		),
	},
	'author-select': {
		title: 'Article with Author Select',
		description: 'Combining useEntity for form data with useEntityList for select options.',
		content: <ArticleWithAuthorSelectExample id="00000000-0000-0000-0000-000000000e01" />,
	},
	'location-picker': {
		title: 'Location Picker',
		description: 'Standalone location select using useEntityList.',
		content: <LocationSelectExample />,
	},
	'block-repeater': {
		title: 'Block Repeater',
		description: 'Repeater with type discrimination — each block renders differently based on its type.',
		content: (
			<>
				<HeadlessBlockRepeaterExample id="00000000-0000-0000-0000-000000000e01" />
				<hr className="my-4" />
				<StyledBlockRepeaterExample id="00000000-0000-0000-0000-000000000e01" />
				<hr className="my-4" />
				<DualModeBlockRepeaterExample id="00000000-0000-0000-0000-000000000e01" />
			</>
		),
	},
	'hasmany-datagrid': {
		title: 'HasMany DataGrid',
		description: 'Data grid for a has-many relation field (Author → Articles).',
		content: <HasManyDataGridExample id="00000000-0000-0000-0000-000000000a01" />,
	},
}

// ============================================================================
// Router
// ============================================================================

function useHashRoute(): string {
	const [hash, setHash] = useState(() => window.location.hash.slice(1) || '')
	useEffect(() => {
		const handler = (): void => setHash(window.location.hash.slice(1) || '')
		window.addEventListener('hashchange', handler)
		return () => window.removeEventListener('hashchange', handler)
	}, [])
	return hash
}

/**
 * Example application demonstrating bindx usage
 */
export function App(): ReactNode {
	const route = useHashRoute()
	const page = pages[route]

	return (
		<AppProvider>
			<div className="app" data-testid="app">
				<header>
					<h1><a href="#" className="no-underline text-inherit">Bindx Demo</a></h1>
					<p>Examples of data binding patterns with fragments and entity lists</p>
				</header>

				{page ? (
					<main>
						<nav className="mb-4">
							<a href="#" className="text-sm text-gray-500 hover:text-gray-700">← Back to index</a>
						</nav>
						<section data-testid={`section-${route}`}>
							<h2>{page.title}</h2>
							<p>{page.description}</p>
							{page.content}
						</section>
					</main>
				) : (
					<main>
						<nav className="flex flex-col gap-1">
							{Object.entries(pages).map(([key, { title, description }]) => (
								<a
									key={key}
									href={`#${key}`}
									className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors no-underline"
									data-testid={`nav-${key}`}
								>
									<div className="font-medium">{title}</div>
									<div className="text-sm text-gray-500">{description}</div>
								</a>
							))}
						</nav>
					</main>
				)}

				<footer>
					<p>Connected to Contember API.</p>
				</footer>
			</div>
		</AppProvider>
	)
}
