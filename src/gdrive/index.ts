import type {
  GoogleDriveV3FilesListFileResource,
  GoogleDriveV3FilesListParameters,
  GoogleDriveV3FilesListResponse,
} from './types'
import { URLSearchParamsFromObject } from '../utils'
import type { CloudflareGdriveResponseItem } from '../types'

export const GOOGLE_DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const GOOGLE_DRIVE_V3_FILES_LIST_URL =
  'https://www.googleapis.com/drive/v3/files/'

interface GoogleDriveV3Options {
  /** The Google Drive's `root` folder id */
  root: string
  /** The Google Drive's API access token */
  token: string

  /** Whether to use alternative list method
   *
   * This alternative method can bypass Cloudflare Workers 50 subrequests limit most of the time, but it'll make requests speed a bit slow. Recursive listing of many folders or nested paths won't work without this enabled, unless well.. you're on unbounded usage model.
   */
  useAlternativeListMethod: boolean
}

export class GoogleDriveV3 {
  readonly #token: string
  readonly #useAlternativeListMethod: boolean

  #root: string
  #caches: GoogleDriveV3FilesListFileResource[] | undefined

  constructor({ root, token, useAlternativeListMethod }: GoogleDriveV3Options) {
    this.#root = root
    this.#token = token
    this.#useAlternativeListMethod = useAlternativeListMethod
  }

  get #authHeaders() {
    return new Headers({ Authorization: `Bearer ${this.#token}` })
  }

  set root(value: string) {
    this.#root = value
  }

  filesGet = async (
    fileId: string,
    paths: string[] = ['']
  ): Promise<CloudflareGdriveResponseItem> => {
    const parameters: GoogleDriveV3FilesListParameters = {
      fields: 'id, name, mimeType, size, imageMediaMetadata, parents',
      includeItemsFromAllDrives: true,
      q: 'trashed = false',
      supportsAllDrives: true,
    }

    const url = new URL(GOOGLE_DRIVE_V3_FILES_LIST_URL + fileId)
    url.search = URLSearchParamsFromObject({ ...parameters }).toString()

    const response = await fetch(url.toString(), { headers: this.#authHeaders })

    const {
      id,
      mimeType: mime,
      name,
    } = await response.json<GoogleDriveV3FilesListFileResource>()
    const path =
      id === this.#root || paths.length === 1 ? '/' : [...paths, name].join('/')

    return { id, mime, name, path }
  }

  filesGetDownload = async (fileId: string): Promise<Blob> => {
    const parameters: GoogleDriveV3FilesListParameters = {
      supportsAllDrives: true,
    }

    const url = new URL(GOOGLE_DRIVE_V3_FILES_LIST_URL + fileId)
    url.search = URLSearchParamsFromObject({ ...parameters }).toString()
    url.searchParams.append('alt', 'media')

    const response = await fetch(url.toString(), { headers: this.#authHeaders })

    return response.blob()
  }

  filesList = async (
    folderId: string,
    { recursive = false, paths = [''] } = {}
  ): Promise<CloudflareGdriveResponseItem[]> => {
    let q = 'trashed = false'
    if (!this.#useAlternativeListMethod) q += ` and '${folderId}' in parents`

    const parameters: GoogleDriveV3FilesListParameters = {
      fields:
        'nextPageToken, files(id, name, mimeType, size, imageMediaMetadata, parents)',
      includeItemsFromAllDrives: true,
      pageSize: 1000,
      q,
      supportsAllDrives: true,
    }

    let resources: GoogleDriveV3FilesListFileResource[] = []

    if (
      !this.#useAlternativeListMethod ||
      (this.#useAlternativeListMethod && this.#caches === undefined)
    ) {
      let pageToken: string | undefined = undefined
      do {
        const search = URLSearchParamsFromObject({ ...parameters })
        if (pageToken !== undefined) search.append('pageToken', pageToken)

        const url = new URL(GOOGLE_DRIVE_V3_FILES_LIST_URL)
        url.search = search.toString()

        const response = await fetch(url.toString(), {
          headers: this.#authHeaders,
        })

        const { files, nextPageToken } =
          await response.json<GoogleDriveV3FilesListResponse>()

        pageToken = nextPageToken
        resources.push(...files)
      } while (pageToken !== undefined)
    } else {
      resources = this.#caches!
    }

    const mapResult = ({
      id,
      mimeType: mime,
      name,
    }: GoogleDriveV3FilesListFileResource): CloudflareGdriveResponseItem => ({
      id,
      mime,
      name,
      path: [...paths, name].join('/'),
    })

    if (this.#useAlternativeListMethod) {
      this.#caches = resources

      const results = resources
        .filter(({ parents }) => parents?.includes(folderId))
        .map(mapResult)

      if (!recursive) return results

      const mapRecursiveResult = (
        it: CloudflareGdriveResponseItem
      ): CloudflareGdriveResponseItem => {
        const children =
          it.mime === GOOGLE_DRIVE_FOLDER_MIME
            ? resources
                .filter(({ parents }) => parents?.includes(it.id))
                .map(mapResult)
                .map((child) => ({
                  ...child,
                  path: [it.path, child.name].join('/'),
                }))
                .map(mapRecursiveResult)
            : undefined

        return {
          ...it,
          children,
        }
      }

      return results.map(mapRecursiveResult)
    } else {
      const results = resources.map(mapResult)

      if (recursive) {
        const folders = results
          .map(({ id, mime, name }, index) => ({ id, index, mime, name }))
          .filter(({ mime }) => mime === GOOGLE_DRIVE_FOLDER_MIME)
        const childrens = await Promise.all(
          folders.map(async ({ id, index, name }) => ({
            index,
            children: await this.filesList(id, {
              recursive,
              paths: [...paths, name],
            }),
          }))
        )

        for (const { index, children } of childrens) {
          results[index]!.children = children
        }
      }

      return results
    }
  }

  resolvePath = async (
    paths: string[] = ['']
  ): Promise<CloudflareGdriveResponseItem | undefined> => {
    if (paths.length === 1) return this.filesGet(this.#root)

    let current = this.#root
    for (const [index, path] of paths.slice(1).entries()) {
      const files = await this.filesList(current, {
        paths: paths.slice(0, index + 1),
      })
      const child = files.find(({ name }) => name === path)

      if (child === undefined) return
      else if (path === paths.at(-1)) return child
      else if (child.mime !== GOOGLE_DRIVE_FOLDER_MIME) return

      current = child.id
    }

    return
  }
}
