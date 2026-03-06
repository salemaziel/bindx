/**
 * Example model types for demonstrating bindx
 */

export interface Author {
	id: string
	name: string
	email: string
	bio: string
	articles: Article[]
}

export interface Tag {
	id: string
	name: string
	color: string
	articles: Article[]
}

export interface Location {
	id: string
	lat: number
	lng: number
	label: string
}

export interface ContentReference {
	id: string
	type: string
	imageUrl: string
	caption: string
}

export interface Article {
	id: string
	title: string
	content: string
	richContent: string | null
	publishedAt: string | null
	author: Author
	location: Location
	tags: Tag[]
	contentReferences: ContentReference[]
}
