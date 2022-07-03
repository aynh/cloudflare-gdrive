import { ThrowableRouter, missing } from 'itty-router-extras'

import { handleDownload, handleListings } from './handler'
import { initialize } from './middleware'
import type { IRequest } from './types'

const router = ThrowableRouter()

router.get('*', initialize, async (request: IRequest) => {
	return request.query?.mode === 'list'
		? handleListings(request)
		: handleDownload(request)
})

// catch-all handler
router.all('*', () => missing('empty'))

const fetchHandler: ExportedHandlerFetchHandler<Environment> = (
	request,
	environment,
	context
) => {
	return router.handle(request, environment, context)
}

const worker = {
	fetch: fetchHandler,
} as ExportedHandler<Environment>

export default worker
