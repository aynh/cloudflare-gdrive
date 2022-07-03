import { error, missing } from 'itty-router-extras'

import { createGDrive } from './gdrive'
import type { IRequest } from './types'

const authorize = (request: IRequest, environment: Environment) => {
	if (environment.BEARER_TOKEN !== undefined) {
		const authHeader = request.headers.get('Authorization')
		const regex = /(^Bearer )(?<token>.*)/
		const bearerToken = authHeader?.match(regex)?.groups?.token
		if (bearerToken === undefined || bearerToken !== environment.BEARER_TOKEN) {
			return error(
				403,
				'please provide a valid bearer token in Authorization header'
			)
		} else {
			request.authorized = true
		}
	}
}

const initialize = async (request: IRequest, environment: Environment) => {
	const gdrive = await createGDrive(environment)
	const url = new URL(request.url)

	// remove leading and trailing slash
	const path = decodeURIComponent(url.pathname.replace(/^\/|\/$/g, ''))

	const item = await gdrive.resolvePath(path)
	if (item === undefined) {
		return missing(`path '${path}' does not exist.`)
	}

	request.gdrive = gdrive
	request.item = item
	request.path = path
}

export { authorize, initialize }
