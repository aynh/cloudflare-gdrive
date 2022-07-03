// https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2
// 4.2.2.  Access Token Response
interface AccessTokenResponse {
	access_token: string
	expires_in: number
	scope: string
	token_type: 'Bearer'
}

const fetchAccessToken = async ({
	CLIENT_ID,
	CLIENT_SECRET,
	REFRESH_TOKEN,
}: Environment) => {
	const body = new URLSearchParams()
	body.append('client_id', CLIENT_ID)
	body.append('client_secret', CLIENT_SECRET)
	body.append('refresh_token', REFRESH_TOKEN)
	body.append('grant_type', 'refresh_token')

	// https://datatracker.ietf.org/doc/html/rfc6749#section-6
	// 6.  Refreshing an Access Token
	const response = await fetch('https://oauth2.googleapis.com/token', {
		body: body,
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		method: 'POST',
	})

	if (response.status !== 200) {
		throw new Error('Failed to get Access Token')
	}

	return response.json<AccessTokenResponse>()
}

export { AccessTokenResponse, fetchAccessToken }
