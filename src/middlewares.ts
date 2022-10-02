import { GoogleDriveV3 } from './gdrive'
import { fetchAccessToken } from './oauth'
import type {
  CloudflareGdriveOptions,
  CloudflareGdriveResponseItem,
} from './types'

type KnownQuery = 'download' | 'list' | 'listrecursive' | 'trash'

export interface LocalRequest extends Request {
  drive: GoogleDriveV3
  path: string
  paths: string[]
  query: Record<KnownQuery, '1' | undefined>
  resolved?: CloudflareGdriveResponseItem
}

export const mapRequest = async (
  request: LocalRequest,
  { oauth, root = 'root', base = '' }: CloudflareGdriveOptions
) => {
  const token = await fetchAccessToken(oauth)
  request.drive = new GoogleDriveV3({
    root,
    token,
    useAlternativeListMethod: false,
  })

  if (root === 'root') {
    // my alternative list method won't work with 'root' alias
    // so we need replace it with actual id
    const { id: rootId } = await request.drive.filesGet(root)
    request.drive.root = rootId
  }

  const url = new URL(request.url)
  request.path = url.pathname.replace(base, '')
  request.paths = request.path === '/' ? [''] : request.path.split('/')
  request.query = Object.fromEntries(url.searchParams.entries()) as any
}

export const mapRequestAndResolvePath = async (
  request: LocalRequest,
  options: CloudflareGdriveOptions
) => {
  await mapRequest(request, options)

  request.resolved = await request.drive.resolvePath(request.paths)
}
