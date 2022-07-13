import { missing, ThrowableRouter } from 'itty-router-extras'

import { generateContext } from './context'
import { handleListings, handleDownload, handleUpload } from './handler'
import { auth } from './middleware'
import { HandlerMethods, HandlerOptions } from './types'

/**
 * Create `cloudflare-gdrive` handler.
 * @params {@link HandlerOptions}
 */
export const createHandler = (options: HandlerOptions) => {
	return async (request: Request) => {
		const router = ThrowableRouter({ base: options.base })

		const authorize = () =>
			auth(request, options.requireAuth[request.method as HandlerMethods])

		router.get('*', authorize, async () => {
			const context = await generateContext('GET', request, options)

			return context.query.list !== undefined
				? handleListings(context)
				: handleDownload(context)
		})

		router.post('*', authorize, async () => {
			const context = await generateContext('POST', request, options)
			return handleUpload(context)
		})

		router.all('*', missing)

		return router.handle(request) as Promise<Response>
	}
}
