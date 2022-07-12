import { StatusError } from 'itty-router-extras'

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2
 */
interface AccessTokenResponse {
	access_token: string
	expires_in: number
	scope: string
	token_type: 'Bearer'
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-6
 */
interface FetchAccessTokenOptions {
	clientId: string
	clientSecret: string
	refreshToken: string
}

const fetchAccessToken = async ({
	clientId,
	clientSecret,
	refreshToken,
}: FetchAccessTokenOptions) => {
	const body = new URLSearchParams()
	body.append('client_id', clientId)
	body.append('client_secret', clientSecret)
	body.append('refresh_token', refreshToken)
	body.append('grant_type', 'refresh_token')

	const response = await fetch('https://oauth2.googleapis.com/token', {
		body: body,
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		method: 'POST',
	})

	if (response.status !== 200) {
		const detail = await response.text()
		throw new StatusError(500, `failed to get Access Token. ${detail}`)
	}

	const json = await response.json<AccessTokenResponse>()

	return json.access_token
}

export { AccessTokenResponse, FetchAccessTokenOptions, fetchAccessToken }
