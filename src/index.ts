import { error, missing, ThrowableRouter } from 'itty-router-extras'

import { GetHandler, PutHandler } from './handler'
import {
  LocalRequest,
  mapRequest,
  mapRequestAndResolvePath,
} from './middlewares'
import type { CloudflareGdriveOptions } from './types'

export const handle = (options: CloudflareGdriveOptions) => {
  return async (request: Request): Promise<Response> => {
    const router = ThrowableRouter<LocalRequest>({ base: options.base })

    router.get!(
      '*',
      mapRequestAndResolvePath,
      async ({ resolved, ...localRequest }) => {
        if (resolved === undefined) return missing()

        return new GetHandler(resolved, localRequest, options).handle()
      }
    )

    router.put!('*', mapRequest, async (localRequest) => {
      if (localRequest.body === null) return error(400, 'missing request body')

      const { readable, writable } = new TransformStream()
      localRequest.body.pipeTo(writable)

      return new PutHandler(readable, localRequest, options).upload()
    })

    router.all('*', () => error(405, 'request method not supported'))

    return router.handle(request as LocalRequest, options)
  }
}
