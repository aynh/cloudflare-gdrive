import { error } from 'itty-router-extras'

import { GOOGLE_DRIVE_FOLDER_MIME } from './gdrive'
import type { LocalRequest } from './middlewares'
import type {
  CloudflareGdriveResponseItem,
  CloudflareGdriveOptions,
} from './types'
import { responseFromItem } from './utils'

type HandlerContext = Pick<LocalRequest, 'drive' | 'path' | 'paths' | 'query'>

class Handler {
  protected context: HandlerContext
  protected options: CloudflareGdriveOptions

  constructor(context: HandlerContext, options: CloudflareGdriveOptions) {
    this.context = context
    this.options = options
  }

  private mapItemPath = (path: string) => {
    const { options } = this

    const paths = path.split('/').slice(1)
    const bases = options.base?.split('/') ?? ['']
    return [...bases, ...paths].join('/')
  }

  protected mapItem = (
    item: CloudflareGdriveResponseItem
  ): CloudflareGdriveResponseItem => {
    const { path, ...rest } = item
    const children = item.children?.map(this.mapItem)

    return {
      ...rest,
      path: this.mapItemPath(path),
      children,
    }
  }
}

export class GetHandler extends Handler {
  private item: CloudflareGdriveResponseItem

  constructor(
    item: CloudflareGdriveResponseItem,
    context: HandlerContext,
    options: CloudflareGdriveOptions
  ) {
    super(context, options)
    this.item = item
  }

  private default = async (): Promise<Response> =>
    responseFromItem(this.mapItem(this.item))

  private download = async (): Promise<Response> => {
    const { item, context } = this

    if (item.mime.startsWith('application/vnd.google')) {
      return error(
        400,
        `path '${context.path}' is a Google Drive specific item, unable to download`
      )
    } else {
      const response = await context.drive.filesGetDownload(item.id)

      if (response.body === null)
        return error(
          500,
          `failed to download '${context.path}', response body is empty`
        )

      const { readable, writable } = new TransformStream()
      response.body.pipeTo(writable)

      return new Response(readable, { headers: response.headers })
    }
  }

  private list = async (): Promise<Response> => {
    const { item, context } = this

    if (item.mime !== GOOGLE_DRIVE_FOLDER_MIME) {
      return error(400, `path '${context.path} is not a folder, unable to list`)
    } else {
      const recursive = context.query.listrecursive === '1'
      const items = await context.drive
        .filesList(item.id, {
          recursive,
          paths: context.paths,
        })
        .then((items) => items.map(this.mapItem))

      return responseFromItem(items)
    }
  }

  handle = async (): Promise<Response> => {
    const { query } = this.context

    if (query.download === '1') {
      return this.download()
    } else if (query.list === '1' || query.listrecursive === '1') {
      return this.list()
    } else {
      return this.default()
    }
  }
}

export class PutHandler extends Handler {
  private stream: ReadableStream

  constructor(
    stream: ReadableStream,
    context: HandlerContext,
    options: CloudflareGdriveOptions
  ) {
    super(context, options)
    this.stream = stream
  }

  upload = async (): Promise<Response> => {
    const { drive, paths } = this.context

    const parentPaths = paths.slice(0, -1)
    const parent = await drive.createFolders(parentPaths)
    const result = await drive.uploadStream(this.stream, paths.at(-1)!, {
      parent: parent.id,
      paths: parentPaths,
    })

    return responseFromItem(this.mapItem(result))
  }
}
