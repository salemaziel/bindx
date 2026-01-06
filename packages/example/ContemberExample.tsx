/**
 * Example showing how to use ContemberBindxProvider with production Contember Content API
 *
 * This example demonstrates:
 * 1. Setting up ContemberBindxProvider with API configuration
 * 2. Using the same useEntity/useEntityList hooks with real GraphQL backend
 */

import { ContemberBindxProvider } from '@contember/react-bindx'
import type { SchemaNames } from '@contember/client-content'
import { ArticleEditor } from './components/index.js'

/**
 * Schema names required by @contember/client-content
 *
 * In a real project, this would be generated from your Contember schema.
 * For this example, we define it manually to match our types.
 */
const contemberSchema: SchemaNames = {
	entities: {
		Article: {
			name: 'Article',
			scalars: ['id', 'title', 'content', 'publishedAt'],
			fields: {
				id: { type: 'column' },
				title: { type: 'column' },
				content: { type: 'column' },
				publishedAt: { type: 'column' },
				author: { type: 'one', entity: 'Author' },
				location: { type: 'one', entity: 'Location' },
				tags: { type: 'many', entity: 'Tag' },
			},
		},
		Author: {
			name: 'Author',
			scalars: ['id', 'name', 'email', 'bio'],
			fields: {
				id: { type: 'column' },
				name: { type: 'column' },
				email: { type: 'column' },
				bio: { type: 'column' },
				articles: { type: 'many', entity: 'Article' },
			},
		},
		Tag: {
			name: 'Tag',
			scalars: ['id', 'name', 'color'],
			fields: {
				id: { type: 'column' },
				name: { type: 'column' },
				color: { type: 'column' },
				articles: { type: 'many', entity: 'Article' },
			},
		},
		Location: {
			name: 'Location',
			scalars: ['id', 'lat', 'lng', 'label'],
			fields: {
				id: { type: 'column' },
				lat: { type: 'column' },
				lng: { type: 'column' },
				label: { type: 'column' },
			},
		},
	},
	enums: {},
}

/**
 * Example app using Contember Content API
 */
export function ContemberApp() {
	return (
		<ContemberBindxProvider
			apiBaseUrl="https://api.example.com"
			project="my-blog"
			stage="live"
			sessionToken="your-session-token-here"
			schema={contemberSchema}
		>
			<div className="app">
				<header>
					<h1>Bindx + Contember Demo</h1>
					<p>Using real Contember Content API backend</p>
				</header>

				<main>
					<section>
						<h2>Article Editor</h2>
						<p>Edit article data from Contember Content API</p>
						{/* Same component, different backend! */}
						<ArticleEditor id="your-article-uuid" />
					</section>
				</main>
			</div>
		</ContemberBindxProvider>
	)
}

/**
 * Alternative: Using ContemberAdapter directly with BindxProvider
 *
 * This gives you more control over the GraphQL client configuration.
 */
import { BindxProvider, ContemberAdapter } from '@contember/react-bindx'
import { GraphQlClient } from '@contember/graphql-client'

export function ContemberAppAlternative() {
	// Create GraphQL client with custom options
	const graphQlClient = new GraphQlClient({
		url: 'https://api.example.com/content/my-blog/live',
		apiToken: 'your-session-token',
		// Custom options:
		onBeforeRequest: () => {
			console.log('Making GraphQL request...')
		},
		onResponse: (response: Response) => {
			console.log('Received response:', response.status)
		},
	})

	// Create Contember adapter
	const adapter = new ContemberAdapter({
		client: graphQlClient,
		schema: contemberSchema,
	})

	return (
		<BindxProvider adapter={adapter}>
			<ArticleEditor id="your-article-uuid" />
		</BindxProvider>
	)
}
