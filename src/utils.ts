import { StatusError } from 'itty-router-extras'

import { GoogleDriveItem } from './gdrive'
import { HandlerContext } from './types'

const getFilenameFromUrl = (url: string) => {
	// regex from https://stackoverflow.com/a/56258202
	const regex = new RegExp(/(?<=\/)[^#/?]+(?=[^/]*$)/)
	return regex.exec(url)?.[0] ?? url.replace(/\W/g, '_')
}

const getFileFromFormData = async (form: FormData) => {
	const mode = form.get('mode')
	const file = form.get('file')
	const url = form.get('url')

	if (mode === 'fileupload' && file instanceof Blob) {
		return { blob: file, filename: file.name }
	} else if (mode === 'urlupload' && typeof url === 'string') {
		const filename = getFilenameFromUrl(url)
		const response = await fetch(url)
		const blob = await response.blob()
		return { blob, filename }
	} else {
		throw new StatusError(400, 'please provide a valid formdata.')
	}
}

const removeExtraneousSlash = (
	value: string | string[],
	recurse?: boolean
): string => {
	if (Array.isArray(value)) {
		return value
			.map((v) => removeExtraneousSlash(v, recurse))
			.filter((it) => it !== '')
			.join('/')
	} else if (value.split('/').length > 1 && recurse !== false) {
		return removeExtraneousSlash(value.split('/'), false)
	}

	return value.startsWith('/') || value.endsWith('/')
		? removeExtraneousSlash(value.replace(/^\/|\/$/g, ''), recurse)
		: value
}

const transformItem = (
	{ name, mimeType, ...rest }: GoogleDriveItem,
	{ base, gdrive, url }: Pick<HandlerContext, 'base' | 'gdrive' | 'url'>
) => {
	const urlClone = new URL(url.toString())

	urlClone.search = '' // remove all search parameter
	urlClone.pathname = removeExtraneousSlash([base, name])

	// add trailing slash if it's a folder
	if (gdrive.isFolder({ mimeType })) {
		urlClone.pathname += '/'
	}

	return {
		mimeType,
		path: urlClone.pathname,
		url: urlClone.toString(),
		...rest,
	}
}

export { getFileFromFormData, removeExtraneousSlash, transformItem }
