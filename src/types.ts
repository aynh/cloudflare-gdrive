import { GDrive, GDriveOptions, GoogleDriveItem } from './gdrive'
import { RefreshAccessTokenParameters } from './oauth'

interface HandlerContext {
  base: string
  gdrive: GDrive
  url: URL
  path: string
  query: Record<string, string | undefined>
}

interface GetHandlerContext extends HandlerContext {
  item: GoogleDriveItem
}

interface PostHandlerContext extends HandlerContext {
  form: FormData
}

type HandlerMethods = 'GET' | 'POST'
interface HandlerOptions extends Omit<GDriveOptions, 'accessToken'> {
  /**
   * route base (e.g `/api`, `/gdrive`).
   */
  base?: string
  /**
   * your credentials or accessToken.
   * @see https://developers.google.com/identity/protocols/oauth2/web-server#offline
   */
  oauth: RefreshAccessTokenParameters | string
  /**
   * handler methods mapped with **Bearer token** to authorize the client.
   *
   * `POST` is required for safety measure because its doing writable operations (uploads and create folder)
   *
   * `GET` only used for read-only operations (fetching and downloading).
   */
  requireAuth: {
    GET?: string
    POST: string
  }
}

export {
  GetHandlerContext,
  PostHandlerContext,
  HandlerContext,
  HandlerMethods,
  HandlerOptions,
}
