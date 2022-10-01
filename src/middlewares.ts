import { GoogleDriveV3 } from './gdrive'
import { fetchAccessToken } from './oauth'
import type { CloudflareGdriveOptions } from './types'

export interface LocalRequest extends Request {
  drive: GoogleDriveV3
  path: string
  paths: string[]
  query: Record<'download' | 'list' | 'listrecursive', string | undefined>
}

export const mapRequest = async (
  request: LocalRequest,
  { oauth, root = 'root', base = '' }: CloudflareGdriveOptions
) => {
  const token = await fetchAccessToken(oauth)
  request.drive = new GoogleDriveV3({
    root,
    token,
    useAlternativeListMethod: true,
  })

  if (root === 'root') {
    // my alternative list method won't work with 'root' alias
    // so we need replace it with actual id
    const { id: rootId } = await request.drive.filesGet(root)
    request.drive.root = rootId
  }

  const url = new URL(request.url)
  const path = url.pathname.replace(base, '')
  request.path = path
  request.paths = path === '/' ? [''] : path.split('/')
  request.query = Object.fromEntries(url.searchParams.entries()) as any
}
