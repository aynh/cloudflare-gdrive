import type { Request } from 'itty-router'

import { GDrive, GoogleDriveItem } from './gdrive'

export interface IRequest extends Request {
	gdrive: GDrive
	headers: Headers
	item: GoogleDriveItem
	path: string
}
