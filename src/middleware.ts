import { StatusError } from 'itty-router-extras'

const auth = (request: Request, token?: string) => {
	if (token !== undefined) {
		const authHeader = request.headers.get('Authorization')
		const bearerToken = authHeader?.match(/(^Bearer )(?<token>.*)/)?.groups
			?.token
		if (bearerToken === undefined || bearerToken !== token) {
			throw new StatusError(
				403,
				'please provide a valid Bearer token in Authorization header'
			)
		}
	}
}

export { auth }
