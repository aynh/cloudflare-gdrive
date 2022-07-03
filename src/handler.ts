import { error, json } from 'itty-router-extras'

import type { IRequest } from './types'
import { transformItem, getFileFromFormData } from './utils'

const handleDownload = async ({
	gdrive,
	item,
	path,
}: Pick<IRequest, 'gdrive' | 'item' | 'path'>) => {
	return gdrive.isFolder(item)
		? error(400, `path '${path}' is a folder, refusing to download.`)
		: new Response(await gdrive.fetchItem(item.id, { download: true }))
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

const handleUpload = async (
	{
		authorized,
		gdrive,
		query,
		url,
	}: Pick<IRequest, 'authorized' | 'gdrive' | 'query' | 'url'>,
	form: FormData
) => {
	const file = await getFileFromFormData(form)
	const name = form.get('name')?.toString()

	if (file !== undefined && name !== undefined) {
		const path = form.get('path')?.toString() ?? ''
		const parent = await gdrive.resolvePath(path, {
			createAsNeeded: Boolean(query?.create) && authorized === true,
		})

		const response = await gdrive.uploadFile(
			{ name, parents: parent?.id },
			file
		)

		const parentPath = path !== '' && parent ? `${parent.name}/` : ''
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

export { handleDownload, handleListings, handleUpload }
