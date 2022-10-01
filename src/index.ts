import { error, missing, ThrowableRouter } from 'itty-router-extras'

import { Handler } from './handler'
import { LocalRequest, mapRequest } from './middlewares'
import type { CloudflareGdriveOptions } from './types'

export const handle = (options: CloudflareGdriveOptions) => {
  return async (request: Request): Promise<Response> => {
    const router = ThrowableRouter<LocalRequest>({ base: options.base })

    router.get!('*', mapRequest, async ({ drive, path, paths, query }) => {
      const item = await drive.resolvePath(paths)

      if (item === undefined) return missing()

      const handle = new Handler(item, { drive, path, paths, query }, options)

      if (query.download === '1') {
        return handle.download()
      } else if (query.list === '1' || query.listrecursive === '1') {
        return handle.list()
      } else {
        return handle.default()
      }
    })

    router.all('*', () => error(405, 'request method not supported'))

    return router.handle(request as LocalRequest, options)
  }
}
