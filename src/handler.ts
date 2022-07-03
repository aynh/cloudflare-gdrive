import { error, json } from 'itty-router-extras'

import type { GoogleDriveItem } from './gdrive'
import type { IRequest } from './types'

const handleDownload = async ({
	gdrive,
	item,
	path,
}: Pick<IRequest, 'gdrive' | 'item' | 'path'>) => {
	return gdrive.isFolder(item)
		? error(400, `path '${path}' is a folder, refusing to download.`)
		: new Response(await gdrive.fetchItem(item.id, { download: true }))
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

const handleListings = async ({
	gdrive,
	item,
	path,
	url,
	query,
}: Pick<IRequest, 'gdrive' | 'item' | 'path' | 'url' | 'query'>) => {
	if (gdrive.isFolder(item)) {
		const recursive_ = query?.recursive

		// check if they want to recurse with spesific depth
		let recursive: boolean | number = Number.parseInt(recursive_ ?? '')

		// check again if they want to recurse them all
		if (Number.isNaN(recursive)) recursive = recursive_ === 'true'

		const folder = query?.folder !== 'false'
		const listing = await gdrive.getListings(item.id, path, recursive)
		return json(
			listing.files
				.filter((item) => (folder ? true : !gdrive.isFolder(item)))
				.map((item) => transformItem(item, { gdrive, path, url }))
		)
	} else {
		return json([transformItem(item, { gdrive, path, url })])
	}
}

const handleFileUpload = async ({ gdrive, url }: IRequest, form: FormData) => {
	const file = form.get('file')
	const path = form.get('path')?.toString()
	const name = form.get('name')?.toString()

	if (file instanceof File && name !== undefined) {
		const parent = await gdrive.resolvePath(path ?? '')

		const response = await gdrive.uploadFile(
			{ name, parents: parent?.id },
			file
		)

		const parentPath = parent ? `${parent.name}/` : ''
		return json(
			[response].map(({ name, ...rest }) =>
				transformItem(
					{
						name: `${parentPath}${name}`,
						...rest,
					},
					{ gdrive, path: parentPath, url }
				)
			)
		)
	}
}

export { handleDownload, handleListings, handleFileUpload }
