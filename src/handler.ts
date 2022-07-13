import { json, StatusError } from 'itty-router-extras'

import { GetHandlerContext, PostHandlerContext } from './types'
import { transformItem, getFileFromFormData } from './utils'

const handleDownload = async ({ gdrive, item, path }: GetHandlerContext) => {
	if (gdrive.isFolder(item))
		throw new StatusError(
			400,
			`path '${path}' is a folder, refusing to download.`
		)

	return gdrive.fetchItem(item.id, 'download')
}

const handleListings = async ({
	base,
	gdrive,
	item,
	path,
	url,
	query,
}: GetHandlerContext) => {
	if (gdrive.isFolder(item)) {
		const recursiveQuery = query.recursive ?? ''

		// check for number or else for the truthiness
		const recursiveDepth = Number.parseInt(recursiveQuery)
		const recursive = Number.isNaN(recursiveDepth)
			? Boolean(recursiveQuery)
			: recursiveDepth

		const listing = await gdrive.getListings(item.id, path, recursive)

		const nofolder = query.nofolder !== undefined
		const nofile = query.nofile !== undefined
		return json(
			listing.files
				.filter(
					(item) =>
						(nofolder ? !gdrive.isFolder(item) : true) &&
						(nofile ? gdrive.isFolder(item) : true)
				)
				.map((item) => transformItem(item, { base, gdrive, url }))
		)
	} else {
		return json([transformItem(item, { base, gdrive, url })])
	}
}

const handleUpload = async ({
	base,
	form,
	gdrive,
	query,
	url,
}: PostHandlerContext) => {
	const { blob, filename } = await getFileFromFormData(form)
	const name = form.get('filename')?.toString() ?? filename
	const path = form.get('path')?.toString() ?? ''
	const parent = await gdrive.resolvePath(path, {
		createAsNeeded: Boolean(query.create),
	})

	const item = await gdrive.uploadFile({ name, parents: parent?.id }, blob)

	const parentPath = parent ? `${parent.name}/` : ''
	return json(
		[item].map(({ name, ...rest }) =>
			transformItem(
				{
					name: `${parentPath}${name}`,
					...rest,
				},
				{ base, gdrive, url }
			)
		)
	)
}

export { handleDownload, handleListings, handleUpload }
