import { Component, type ReactNode, type ErrorInfo } from 'react'

export interface EditorErrorBoundaryProps {
	fallback?: ReactNode
	children: ReactNode
}

interface EditorErrorBoundaryState {
	hasError: boolean
}

export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
	override state: EditorErrorBoundaryState = { hasError: false }

	static getDerivedStateFromError(): EditorErrorBoundaryState {
		return { hasError: true }
	}

	override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error('EditorErrorBoundary caught an error:', error, errorInfo)
	}

	override render(): ReactNode {
		if (this.state.hasError) {
			return this.props.fallback ?? <span style={{ background: 'red', color: 'white' }}>Invalid element</span>
		}
		return this.props.children
	}
}
