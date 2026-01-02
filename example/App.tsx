import { BindxProvider, MockAdapter } from '../src/index.js'
import { mockData } from './mockData.js'
import { ArticleEditor, ArticleView } from './components.js'

// Create mock adapter with sample data
const adapter = new MockAdapter(mockData, { debug: true, delay: 200 })

/**
 * Example application demonstrating bindx usage
 */
export function App() {
	return (
		<BindxProvider adapter={adapter}>
			<div className="app">
				<header>
					<h1>Bindx Demo</h1>
				</header>

				<main>
					<section>
						<h2>Article Editor (Full Fragment Composition)</h2>
						<ArticleEditor id="article-1" />
					</section>

					<section>
						<h2>Article View (Inline Fragment)</h2>
						<ArticleView id="article-2" />
					</section>
				</main>
			</div>
		</BindxProvider>
	)
}
