export const parseUrl = (url: string): URL | undefined => {
	if (url.length < 4 || url.includes(' ')) {
		return undefined
	}
	try {
		return new URL(url)
	} catch {
		return undefined
	}
}
