import { type ReactNode } from 'react'
import { FileActions, type FileActionsProps } from './actions.js'
import { ImageMetadata, type ImageMetadataProps } from './metadata.js'

export interface UploadedImageViewProps extends Omit<FileActionsProps, 'metadata'> {
	url: string
	width?: number | null
	height?: number | null
	fileName?: string | null
	fileSize?: number | null
	fileType?: string | null
	lastModified?: string | Date | null
	alt?: string
}

export const UploadedImageView = ({
	url,
	width,
	height,
	fileName,
	fileSize,
	fileType,
	lastModified,
	alt,
	...actionProps
}: UploadedImageViewProps): ReactNode => {
	const metadata: ImageMetadataProps = {
		url,
		width,
		height,
		fileName,
		fileSize,
		fileType,
		lastModified,
	}

	return (
		<div className="rounded-md border border-gray-200 bg-gray-50 p-2 group relative">
			<div className="flex items-center justify-center min-h-32">
				<img
					src={url}
					alt={alt ?? fileName ?? 'Uploaded image'}
					className="max-w-full max-h-48 object-contain rounded"
				/>
			</div>
			<FileActions
				{...actionProps}
				metadata={<ImageMetadata {...metadata} />}
			/>
		</div>
	)
}
