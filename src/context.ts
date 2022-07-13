import { StatusError } from 'itty-router-extras'

import { GDrive } from './gdrive'
import { fetchAccessToken } from './oauth'
import { HandlerOptions, GetHandlerContext, PostHandlerContext } from './types'
import { removeExtraneousSlash } from './utils'

interface Context {
	GET: GetHandlerContext
	POST: PostHandlerContext
}

const createGDrive = async ({ oauth, ...rest }: HandlerOptions) => {
	const accessToken =
		typeof oauth === 'string' ? oauth : await fetchAccessToken(oauth)

	return new GDrive({ accessToken, ...rest })
}

// get actual path by removing the 'base' segment
const getActualPath = (url: URL, base: string) => {
	return decodeURIComponent(
		removeExtraneousSlash(url.pathname.replace(base, ''))
	)
}

const generateContext = async <Method extends keyof Context>(
	method: Method,
	request: Request,
	options: HandlerOptions
): Promise<Context[Method]> => {
	const gdrive = await createGDrive(options)

	const base = removeExtraneousSlash(options.base ?? '')
	const url = new URL(request.url)
	const query = Object.fromEntries(url.searchParams.entries())
	const path = getActualPath(url, base)

	if (method === 'GET') {
		const item = await gdrive.resolvePath(path)
		if (item === undefined) {
			throw new StatusError(404, `path '${path}' does not exist.`)
		}

		return { base, gdrive, item, path, query, url } as Context[Method]
	} else if (method === 'POST') {
		const contentType = request.headers.get('Content-Type') ?? ''
		if (!contentType.startsWith('multipart/form-data')) {
			throw new StatusError(400, 'please provide a formdata.')
		}

		const form = await request.formData()

		return { base, form, gdrive, path, query, url } as Context[Method]
	} else {
		throw new StatusError(405, `${method} not allowed! expected GET or POST.`)
	}
}

export { Context, generateContext }
