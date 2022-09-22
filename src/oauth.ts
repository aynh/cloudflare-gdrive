import { StatusError } from 'itty-router-extras'

/**
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#offline
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2
 */
interface RefreshAccessTokenResponse {
	/** The access token issued by the authorization server. */
	access_token: string

	/**
	 * The lifetime in seconds of the access token.  For
	 * example, the value "3600" denotes that the access token will
	 * expire in one hour from the time the response was generated.
	 * If omitted, the authorization server SHOULD provide the
	 * expiration time via other means or document the default value.
	 */
	expires_in: number
}

/**
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#offline
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-6
 */
export interface RefreshAccessTokenParameters {
	/** The client ID obtained from the [API Console](https://console.developers.google.com/). */
	client_id: string

	/** The client secret obtained from the [API Console](https://console.developers.google.com/). */
	client_secret: string

	/** The refresh token returned from the authorization code exchange. */
	refresh_token: string
}

export const fetchAccessToken = async ({
	client_id,
	client_secret,
	refresh_token,
}: RefreshAccessTokenParameters) => {
	const body = new URLSearchParams({
		client_id,
		client_secret,
		refresh_token,
		grant_type: 'refresh_token',
	})

	const response = await fetch('https://oauth2.googleapis.com/token', {
		body,
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		method: 'POST',
	})

	if (!response.ok) {
		const text = await response.text()
		throw new StatusError(500, `failed to get Access Token. ${text}`)
	}

	return response
		.json<RefreshAccessTokenResponse>()
		.then(({ access_token }) => access_token)
}
