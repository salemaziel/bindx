import { useMemo } from 'react'
import { useBindxContext } from '@contember/bindx-react'
import { S3UploadClient, type S3UploadClientOptions } from '../uploadClient/S3UploadClient.js'
import { createContentApiS3Signer } from '../utils/urlSigner.js'

/**
 * Creates an S3 upload client using the GraphQL client from bindx context.
 * Requires ContemberBindxProvider (which provides graphQlClient).
 */
export const useS3Client = (options: Partial<S3UploadClientOptions> = {}): S3UploadClient => {
	const { graphQlClient } = useBindxContext()

	return useMemo(() => {
		if (!graphQlClient) {
			throw new Error('useS3Client requires ContemberBindxProvider (graphQlClient not available in context)')
		}

		return new S3UploadClient({
			signUrl: createContentApiS3Signer(graphQlClient),
			...options,
		})
	}, [graphQlClient, options])
}
