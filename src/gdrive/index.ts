import type {
  GoogleDriveV3FilesListFileResource,
  GoogleDriveV3FilesListParameters,
  GoogleDriveV3FilesListResponse,
} from './types'
import { URLSearchParamsFromObject } from '../utils'
import type { CloudflareGdriveResponseItem } from '../types'
import { StatusError } from 'itty-router-extras'

export const GOOGLE_DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'

const GOOGLE_DRIVE_V3_FILES_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files'
const GOOGLE_DRIVE_V3_FILES_URL = 'https://www.googleapis.com/drive/v3/files/'
const GOOGLE_DRIVE_V3_FILES_FIELDS =
  'id, name, mimeType, size, imageMediaMetadata, parents'

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
    return { Authorization: `Bearer ${this.#token}` }
  }

  get #jsonHeaders() {
    return { 'Content-Type': 'application/json; charset=utf-8' }
  }

  set root(value: string) {
    this.#root = value
  }

  filesGet = async (
    fileId: string,
    { paths = [''] } = {}
  ): Promise<CloudflareGdriveResponseItem> => {
    const parameters: GoogleDriveV3FilesListParameters = {
      fields: GOOGLE_DRIVE_V3_FILES_FIELDS,
      includeItemsFromAllDrives: true,
      q: 'trashed = false',
      supportsAllDrives: true,
    }

    const url = new URL(GOOGLE_DRIVE_V3_FILES_URL + fileId)
    url.search = URLSearchParamsFromObject({ ...parameters }).toString()

    const response = await fetch(url.toString(), { headers: this.#authHeaders })

    const resource = await response.json<GoogleDriveV3FilesListFileResource>()

    return this.mapResultFn(resource, paths)
  }

  filesGetDownload = async (fileId: string): Promise<Response> => {
    const parameters: GoogleDriveV3FilesListParameters = {
      supportsAllDrives: true,
    }

    const url = new URL(GOOGLE_DRIVE_V3_FILES_URL + fileId)
    url.search = URLSearchParamsFromObject({ ...parameters }).toString()
    url.searchParams.append('alt', 'media')

    return fetch(url.toString(), { headers: this.#authHeaders })
  }

  filesList = async (
    folderId: string,
    { recursive = false, paths = [''] } = {}
  ): Promise<CloudflareGdriveResponseItem[]> => {
    let q = 'trashed = false'
    if (!this.#useAlternativeListMethod) q += ` and '${folderId}' in parents`

    const parameters: GoogleDriveV3FilesListParameters = {
      fields: `nextPageToken, files(${GOOGLE_DRIVE_V3_FILES_FIELDS})`,
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

        const url = new URL(GOOGLE_DRIVE_V3_FILES_URL)
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

    const mapResult = (
      it: GoogleDriveV3FilesListFileResource
    ): CloudflareGdriveResponseItem => this.mapResultFn(it, paths)

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

  uploadStream = async (
    stream: ReadableStream,
    name: string,
    { parent = this.#root, paths = [''] } = {}
  ) => {
    const parentItems = await this.filesList(parent)
    const existing = parentItems.find(({ name }) => name === name)
    if (existing !== undefined) {
      const path = [...paths, name].join('/')
      throw new StatusError(
        400,
        `unable to upload into '${path}', file already exists`
      )
    }

    const parameters = URLSearchParamsFromObject({
      fields: GOOGLE_DRIVE_V3_FILES_FIELDS,
      uploadType: 'resumable',
      supportsAllDrives: true,
    })

    const initUrl = new URL(GOOGLE_DRIVE_V3_FILES_UPLOAD_URL)
    initUrl.search = parameters.toString()

    const initResponse = await fetch(initUrl.toString(), {
      body: JSON.stringify({
        name,
        parents: [parent],
      } as GoogleDriveV3FilesListFileResource),
      headers: { ...this.#authHeaders, ...this.#jsonHeaders },
      method: 'POST',
    })

    const uploadUrl = initResponse.headers.get('Location')!

    const response = await fetch(uploadUrl, {
      body: stream,
      headers: this.#authHeaders,
      method: 'PUT',
    })

    const resource = await response.json<GoogleDriveV3FilesListFileResource>()

    return this.mapResultFn(resource, paths)
  }

  createFolders = async (
    paths: string[]
  ): Promise<CloudflareGdriveResponseItem> => {
    if (paths.length === 1) return this.filesGet(this.#root)

    const createFolder = async (
      name: string,
      parent: string,
      paths: string[]
    ) => {
      const parameters = URLSearchParamsFromObject({
        fields: GOOGLE_DRIVE_V3_FILES_FIELDS,
        supportsAllDrives: true,
      })

      const url = new URL(GOOGLE_DRIVE_V3_FILES_URL)
      url.search = parameters.toString()

      const response = await fetch(url.toString(), {
        body: JSON.stringify({
          mimeType: GOOGLE_DRIVE_FOLDER_MIME,
          name,
          parents: [parent],
        } as GoogleDriveV3FilesListFileResource),
        headers: { ...this.#authHeaders, ...this.#jsonHeaders },
        method: 'POST',
      })

      const resource = await response.json<GoogleDriveV3FilesListFileResource>()

      return this.mapResultFn(resource, paths)
    }

    let currentId = this.#root
    let result: CloudflareGdriveResponseItem | undefined
    for (const [index, segment] of paths.slice(1).entries()) {
      const parentPaths = paths.slice(0, index + 1)
      const files = await this.filesList(currentId, {
        paths: parentPaths,
      })

      let child = files.find(({ name }) => name === segment)
      if (child === undefined) {
        child = await createFolder(segment, currentId, parentPaths)
      }

      if (child.mime !== GOOGLE_DRIVE_FOLDER_MIME) {
        const path = [...parentPaths, child.name].join('/')
        throw new StatusError(
          400,
          `unable to upload to '${paths.join('/')}', '${path}' is not a folder`
        )
      } else if (segment === paths.at(-1)) {
        result = child
      }

      currentId = child.id
    }

    return result!
  }

  resolvePath = async (
    paths: string[]
  ): Promise<CloudflareGdriveResponseItem | undefined> => {
    if (paths.length === 1) return this.filesGet(this.#root)

    let currentId = this.#root
    for (const [index, segment] of paths.slice(1).entries()) {
      const files = await this.filesList(currentId, {
        paths: paths.slice(0, index + 1),
      })
      const child = files.find(({ name }) => name === segment)

      if (child === undefined) return
      else if (segment === paths.at(-1)) return child
      else if (child.mime !== GOOGLE_DRIVE_FOLDER_MIME) return

      currentId = child.id
    }

    return
  }

  mapResultFn = (
    { id, mimeType: mime, name }: GoogleDriveV3FilesListFileResource,
    paths: string[]
  ): CloudflareGdriveResponseItem => ({
    id,
    mime,
    name,
    path: this.#root === id ? '/' : [...paths, name].join('/'),
  })
}
