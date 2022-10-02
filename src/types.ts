import type { RefreshAccessTokenParameters } from './oauth'

export interface CloudflareGdriveOptions {
  /** the route base, always include a leading slash and no trailing slash
   *
   * @example "/api", "/gdrive"
   */
  base?: string

  /** The id of the folder mapped to `/`.
   *
   * @example "0AMVJ-gRi4t_9Uk9PVA"
   * @default "root"
   */
  root?: string

  /** Experimental options, **don't touch** if you don't know what you're doing! */
  experimental?: {
    /** Whether to use alternative list method
     *
     * This alternative method can bypass Cloudflare Workers 50 subrequests limit most of the time, but it'll slow your requests speed a bit. Recursive listing of many folders or nested paths won't work without this enabled, unless well.. you're on unbounded usage model.
     */
    useAlternativeListMethod?: boolean
  }

  oauth: RefreshAccessTokenParameters
}

export interface CloudflareGdriveResponseItem {
  /** The item's id.
   *
   * @example "1j4zgTLFq0taHd7cuYqEOS6J1f0tMG4Dt"
   */
  id: string

  /** The item's filename or name
   *
   * @example "text.txt"
   */
  name: string

  /** The item's absolute path from the worker's url
   *
   * @example "/gdrive/test/text.txt"
   */
  path: string

  /** The item's mime type, according to Google drive's automatic detection
   *
   * @see https://developers.google.com/drive/api/guides/mime-types
   */
  mime: string

  /** The item's children, only populated on folders when listing recursively */
  children?: CloudflareGdriveResponseItem[]
}

export interface CloudflareGdriveResponse {
  items: CloudflareGdriveResponseItem[]
}
