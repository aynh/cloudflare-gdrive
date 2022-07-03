import { ThrowableRouter, missing } from 'itty-router-extras'

import { handleDownload, handleFileUpload, handleListings } from './handler'
import { initialize } from './middleware'
import type { IRequest } from './types'

const router = ThrowableRouter()

router.get('*', initialize, async (request: IRequest) => {
	return request.query?.mode === 'list'
		? handleListings(request)
		: handleDownload(request)
})

router.post('*', initialize, async (request: IRequest) => {
	const contentType = request.headers.get('Content-Type') ?? ''
	if (contentType.startsWith('multipart/form-data') && request.formData) {
		const form = (await request.formData()) as FormData
		const mode = form.get('mode')
		if (mode === 'fileupload') {
			return handleFileUpload(request, form)
		} else if (mode === 'urlupload') {
			// return handleUrlUpload(request, form)
		}
	}
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
