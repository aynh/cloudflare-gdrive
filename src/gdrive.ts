// https://developers.google.com/drive/api/v3/reference/files/get#http-request
interface FetchItemMap {
	download: Response
	fetch: GoogleDriveItem
}

// https://developers.google.com/drive/api/v3/reference/files/list#http-request
interface GoogleDriveFilesV3Parameters {
	fields?: string
	includeItemsFromAllDrives?: boolean
	pageSize?: number
	pageToken?: string
	q?: string
	supportsAllDrives?: boolean
	trashed?: boolean
	[key: string]: boolean | string | number | undefined
}

interface GoogleDriveFileUploadMetadata {
	name?: string
	mimeType?: string
	parents?: string[] | string
	title?: string
}

/**
 * @see https://developers.google.com/drive/api/v3/reference/files#resource
 */
interface GoogleDriveItem {
	id: string
	name: string
	mimeType: string
	size?: string
	imageMediaMetadata?: {
		height: number
		width: number
		rotation: string
	}
}

/**
 * @see https://developers.google.com/drive/api/v3/reference/files/list#response
 */
interface GoogleDriveListingResponse {
	nextPageToken?: string
	files: GoogleDriveItem[]
}

interface GDriveOptions {
	accessToken: string
	/**
	 * @see [here](https://developers.google.com/drive/api/guides/fields-parameter). You may need to replace {@link GoogleDriveItem} to get proper typings.
	 */
	fileFields?: string
	/**
	 * id of the folder you wish to at be the root path (`/`)
	 */
	rootFolderId?: string
}

class GDrive {
	readonly #accessToken: string
	readonly #rootFolderId: string

	/**
	 * @see https://developers.google.com/drive/api/v3/reference/files#resource
	 */
	readonly #fileFields: string

	constructor({ accessToken, fileFields, rootFolderId }: GDriveOptions) {
		this.#accessToken = accessToken
		this.#rootFolderId = rootFolderId ?? 'root'
		this.#fileFields =
			fileFields ?? 'id, name, mimeType, size, imageMediaMetadata'
	}

	get #headers() {
		return new Headers({ Authorization: `Bearer ${this.#accessToken}` })
	}

	get #jsonHeaders() {
		const headers = this.#headers
		headers.append('Content-Type', 'application/json')
		return headers
	}

	#fetchFilesV3 = async (
		parameters_: GoogleDriveFilesV3Parameters,
		id?: string
	) => {
		const url = new URL(`https://www.googleapis.com/drive/v3/files/${id ?? ''}`)

		const parameters = {
			supportsAllDrives: true,
			...parameters_,
		} as GoogleDriveFilesV3Parameters

		for (const [key, value] of Object.entries(parameters)) {
			if (value !== undefined) url.searchParams.append(key, value.toString())
		}

		return fetch(url.toString(), { headers: this.#headers })
	}

	/**
	 * upload file using `resumable download` method.
	 * @see https://developers.google.com/drive/api/guides/manage-uploads#resumable
	 */
	uploadFile = async (metadata: GoogleDriveFileUploadMetadata, blob: Blob) => {
		const url = new URL('https://www.googleapis.com/upload/drive/v3/files')
		url.searchParams.append('fields', this.#fileFields)
		url.searchParams.append('uploadType', 'resumable')
		url.searchParams.append('supportsAllDrives', 'true')

		const { parents = [this.#rootFolderId] } = metadata

		// initial request
		const initResponse = await fetch(url.toString(), {
			body: JSON.stringify({
				...metadata,
				parents: Array.isArray(parents) ? parents : [parents],
			}),
			headers: this.#jsonHeaders,
			method: 'POST',
		})

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const putUrl = initResponse.headers.get('Location')!

		// upload the content
		const response = await fetch(putUrl, {
			body: blob,
			headers: this.#headers,
			method: 'PUT',
		})

		return response.json<GoogleDriveItem>()
	}

	createFolder = async (name: string, parent = this.#rootFolderId) => {
		const url = new URL('https://www.googleapis.com/drive/v3/files')
		url.searchParams.append('fields', this.#fileFields)
		url.searchParams.append('supportsAllDrives', 'true')

		const body = {
			mimeType: FOLDER_MIME,
			name,
			parents: [parent],
		}

		const response = await fetch(url.toString(), {
			body: JSON.stringify(body),
			headers: this.#jsonHeaders,
			method: 'POST',
		})

		return response.json<GoogleDriveItem>()
	}

	/**
	 * @see https://developers.google.com/drive/api/guides/manage-uploads#resumable
	 */
	fetchItem = async <K extends keyof FetchItemMap>(
		id: string,
		mode: K
	): Promise<FetchItemMap[K]> => {
		const parameters = {} as GoogleDriveFilesV3Parameters

		if (mode === 'download') {
			parameters.alt = 'media'
		} else {
			parameters.fields = this.#fileFields
		}

		const response = await this.#fetchFilesV3(parameters, id)

		return (
			mode === 'download' ? response : response.json<GoogleDriveItem>()
		) as FetchItemMap[K]
	}

	/**
	 * @see https://developers.google.com/drive/api/v3/reference/files/list
	 */
	fetchListings = async (
		parent = this.#rootFolderId,
		nextPageToken?: string
	) => {
		const parameters = {
			fields: `nextPageToken, files(${this.#fileFields})`,
			includeItemsFromAllDrives: true,
			nextPageToken,
			pageSize: 1000,
			q: `'${parent}' in parents and trashed = false`,
		}

		const response = await this.#fetchFilesV3(parameters)

		return response.json<GoogleDriveListingResponse>()
	}

	getItem = async (name: string, parent = this.#rootFolderId) => {
		const record = await this.getListings(parent)

		return record.files.find((item) => name === item.name)
	}

	getListings = async (
		parent = this.#rootFolderId,
		path?: string,
		recursive?: boolean | number
	) => {
		const result = await this.fetchListings(parent)

		while (result.nextPageToken !== undefined) {
			// eslint-disable-next-line no-await-in-loop
			const next = await this.fetchListings(parent, result.nextPageToken)

			result.files.push(...next.files)
			result.nextPageToken = next.nextPageToken
		}

		result.files = result.files.map(({ name, ...rest }) => ({
			name: path !== undefined ? `${path}/${name}` : name,
			...rest,
		}))

		if (
			recursive === true ||
			(recursive !== undefined && recursive !== false && recursive > 0)
		) {
			if (recursive !== true) recursive -= 1

			const next = await Promise.all(
				result.files
					.filter((item) => this.isFolder(item))
					.map(({ id, name }) => this.getListings(id, name, recursive))
			)

			result.files.push(...next.flatMap(({ files }) => files))
		}

		return result
	}

	isFolder = (item: Pick<GoogleDriveItem, 'mimeType'>) =>
		item.mimeType === FOLDER_MIME

	resolvePath = async (
		path: string,
		options?: { createAsNeeded?: boolean }
	) => {
		if (path === '') {
			return this.fetchItem(this.#rootFolderId, 'fetch')
		}

		const split = path.split('/')
		const root = this.#rootFolderId
		const parentsId: (string | undefined)[] = [root]
		const parentsPath: (string | undefined)[] = [undefined]
		const items: (GoogleDriveItem | undefined)[] = []
		for (const [index, subPath] of split.entries()) {
			const parentId = parentsId[index]

			// eslint-disable-next-line no-await-in-loop
			let item = await this.getItem(subPath, parentId)
			if (options?.createAsNeeded === true && item === undefined) {
				// eslint-disable-next-line no-await-in-loop
				item = await this.createFolder(subPath, parentId)
				console.log(item)
			}

			parentsId.push(item?.id)
			parentsPath.push(item?.name)
			items.push(item)
		}

		const item = items.at(-1)
		if (item) {
			const parent = parentsPath.slice(0, -1).join('/')
			const { name, ...rest } = item
			return {
				name: `${parent}/${name}`,
				...rest,
			}
		}
	}
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'

export {
	FOLDER_MIME,
	GDrive,
	GDriveOptions,
	GoogleDriveItem,
	GoogleDriveFileUploadMetadata,
	GoogleDriveFilesV3Parameters,
	GoogleDriveListingResponse,
}
