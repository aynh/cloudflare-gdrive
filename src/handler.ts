import { error, json } from 'itty-router-extras'

import { GOOGLE_DRIVE_FOLDER_MIME } from './gdrive'
import type { LocalRequest } from './middlewares'
import type {
  CloudflareGdriveResponseItem,
  CloudflareGdriveOptions,
} from './types'

type HandlerContext = Pick<LocalRequest, 'drive' | 'path' | 'paths' | 'query'>

export class Handler {
  private item: CloudflareGdriveResponseItem
  private context: HandlerContext
  private options: CloudflareGdriveOptions

  constructor(
    item: CloudflareGdriveResponseItem,
    context: HandlerContext,
    options: CloudflareGdriveOptions
  ) {
    this.item = item
    this.context = context
    this.options = options
  }

  private mapItem = (
    item: CloudflareGdriveResponseItem = this.item
  ): CloudflareGdriveResponseItem => {
    const { path, ...rest } = item
    const children = item.children?.map(this.mapItem)

    return {
      ...rest,
      path: this.mapItemPath(path),
      children,
    }
  }

  private mapItemPath = (path: string) => {
    const { options } = this

    const paths = path.split('/').slice(1)
    const bases = options.base?.split('/') ?? ['']
    return [...bases, ...paths].join('/')
  }

  default = async (): Promise<Response> => json({ items: [this.mapItem()] })

  download = async (): Promise<Response> => {
    const { item, context } = this

    if (item.mime.startsWith('application/vnd.google')) {
      return error(
        400,
        `path '${context.path}' is a Google Drive specific item, unable to download`
      )
    } else {
      const blob = await context.drive.filesGetDownload(item.id)
      const headers = new Headers({ 'Content-Type': item.mime })

      return new Response(blob, { headers })
    }
  }

  list = async (): Promise<Response> => {
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

      return json({ items })
    }
  }
}
