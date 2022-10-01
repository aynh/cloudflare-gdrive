/**
 * @request GET https://www.googleapis.com/drive/v3/files
 *
 * @see https://developers.google.com/drive/api/v3/reference/files/list#parameters
 */
export interface GoogleDriveV3FilesListParameters {
  /** The paths of the fields you want included in the response.
   *
   * @see https://developers.google.com/drive/api/guides/fields-parameter
   */
  fields?: string

  /** Whether both My Drive and shared drive items should be included in results.
   * (Default: `false`)  */
  includeItemsFromAllDrives?: boolean

  /** The maximum number of files to return per page. Partial or empty result
   * pages are possible even before the end of the files list has been reached.
   * Acceptable values are `1` to `1000`, inclusive.
   * (Default: `100`) */
  pageSize?: number

  /** The token for continuing a previous list request on the next page.
   * This should be set to the value of 'nextPageToken' from the previous response.  */
  pageToken?: string

  /** A query for filtering the file results.
   *
   * @see A query for filtering the file results.
   */
  q?: string

  /** Whether the requesting application supports both My Drives and shared drives.
   * (Default: `false`)  */
  supportsAllDrives?: boolean
}

export interface GoogleDriveV3FilesListFileResource {
  /** The ID of the file. */
  id: string

  /** The name of the file. This is not necessarily unique within a folder. */
  name: string

  /** The MIME type of the file. */
  mimeType: string

  /**
   * The size of the file's content in bytes.
   * This is applicable to binary files in Google Drive and Google Docs files.
   */
  size?: number

  /** The IDs of the parent folders which contain the file */
  parents?: string[]

  /** Additional metadata about image media, if available. */
  imageMediaMetadata?: {
    /** The width of the image in pixels. */
    width: number

    /** The height of the image in pixels. */
    height: number

    /** The number of clockwise 90 degree rotations applied from the image's original orientation. */
    rotation: number
  }
}

export interface GoogleDriveV3FilesListResponse {
  /**
   * The page token for the next page of files.
   * This will be absent if the end of the files list has been reached.
   */
  nextPageToken?: string

  /**
   * The list of files.
   * If nextPageToken is populated, then this list may be incomplete and an additional page of results should be fetched.
   */
  files: GoogleDriveV3FilesListFileResource[]
}
