import type { Request } from 'itty-router'

import { GDrive, GoogleDriveItem } from './gdrive'

export interface IRequest extends Request {
	authorized?: boolean
	gdrive: GDrive
	headers: Headers
	item: GoogleDriveItem
	path: string
}
