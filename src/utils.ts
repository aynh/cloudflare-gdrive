import { GoogleDriveItem } from './gdrive'
import { IRequest } from './types'

const getFileFromFormData = async (form: FormData) => {
	const mode = form.get('mode')
	const file = form.get('file')
	const url = form.get('url')

	if (mode === 'fileupload' && file instanceof File) {
		return file
	} else if (mode === 'urlupload' && typeof url === 'string') {
		const response = await fetch(url)
		return response.blob()
	}
}

const transformItem = (
	{ name, mimeType, ...rest }: GoogleDriveItem,
	{ gdrive, path, url }: Pick<IRequest, 'gdrive' | 'path' | 'url'>
) => {
	const url_ = new URL(url)

	// remove all search parameter
	url_.search = ''

	// only transform if it's not exact path
	if (path !== name) {
		url_.pathname = !url_.pathname.endsWith('/') ? `/${name}` : name

		if (
			// add trailing slash if it's a folder
			gdrive.isFolder({ mimeType }) &&
			!url_.pathname.endsWith('/')
		)
			url_.pathname += '/'
	}

	return {
		mimeType,
		path: url_.pathname.replace(/^\//, ''),
		url: url_.toString(),
		...rest,
	}
}

export { getFileFromFormData, transformItem }
