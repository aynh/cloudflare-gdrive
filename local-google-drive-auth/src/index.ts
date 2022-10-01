interface Environment {
  CLIENT_ID: string
  CLIENT_SECRET: string
}

export default <ExportedHandler<Environment>>{
  fetch: async (request, { CLIENT_ID, CLIENT_SECRET }) => {
    if (request.method === 'GET') {
      const url = new URL(request.url)

      switch (url.pathname) {
        case '/': {
          // ref: https://developers.google.com/identity/protocols/oauth2/web-server#offline
          const parameters = new URLSearchParams({
            access_type: 'offline',
            client_id: CLIENT_ID,
            redirect_uri: new URL('/auth', url.origin).toString(),
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/drive',
          })

          const redirect = new URL(
            'https://accounts.google.com/o/oauth2/v2/auth'
          )
          redirect.search = parameters.toString()

          return Response.redirect(redirect.toString())
        }

        case '/auth': {
          const code = url.searchParams.get('code')
          if (code !== null) {
            const oauth = {
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET,
              refresh_token: code,
            }

            return new Response(JSON.stringify(oauth), {
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            })
          }

          break
        }

        default:
          break
      }
    }

    return new Response(undefined, { status: 404 })
  },
}
