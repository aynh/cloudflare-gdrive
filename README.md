# cloudflare-gdrive

Leverage Google Drive as File Server (with direct download, fileupload, and urlupload feature) using Cloudflare Workers.

## Setup

1.  [Get your `refresh token`](#getting-refresh_token) (using [rclone](https://rclone.org)).

2.  Follow [Workers Get Started Guide](https://developers.cloudflare.com/workers/get-started/guide/), or use [my template](https://github.com/Aynh/cloudflare-workers-template).

3.  Install `cloudflare-gdrive` package

```
yarn add cloudflare-gdrive
```

4. Use `createHandler` import from `cloudflare-gdrive` to create the `handler`.

> Options:
>
> - `base`: Only accept request prefixed with this string, default to '' (accept all requests).
> - `oauth`: Put `client_id`, `client_secret`, and `refresh_token` you got from [step 1](#getting-refresh_token) here.
> - `requireAuth`: Record of HTTP Methods (`GET` and `POST`) mapped with Bearer Token to authorize the client (`POST` is required, `GET` optional).
> - `rootFolderId`: ID of the Google Drive folder you wish to be at `base` path, default to 'root' (your My Drive folder).

<details>
<summary>Example</summary>

```typescript
import { createHandler } from 'cloudflare-gdrive'

const fetchHandler = () => {
	return createHandler({
		base: '/api',
		oauth: {
			clientId: YOUR_CLIENT_ID,
			clientSecret: YOUR_CLIENT_SECRET,
			refreshToken: YOUR_REFRESH_TOKEN,
		},
		requireAuth: {
			GET: 'tokenhere',
			POST: 'veryhardbearertoken',
		},
		rootFolderId:
			'0B8VJ-gRi4t_9fnZzWGZHMzNBSG9lR1JlRGxwMGVZWUlONzdBeVB3dnRPTDgyQUJwT3RpMVU',
	})
}

export default {
	fetch: fetchHandler,
}
```

</details>

## Usage

### `GET`

GET-ting is pretty straight forward. You can fetch as you would like while using `ftp`, the path will be mapped to the correct file.

```

GET http://example.com/path/to/file/

```

#### Search query

<details>
<summary>"list", list the files instead of downloading them.</summary>

#### Example

```
GET http://example.com/?list
```

response:

```json
[
	{
		"mimeType": "application/vnd.google-apps.folder",
		"path": "/test/",
		"url": "http://example.com/test/",
		"id": "1JFE64puRxwB3MdasFrumhTFYcFxJiN4Z"
	},
	{
		"mimeType": "text/plain",
		"path": "/text.txt",
		"url": "http://example.com/text.txt",
		"id": "13FmU4rGY2j5NLmzW0cmxetlHvYpF0eET",
		"size": "18848"
	}
]
```

</details>

<details>
<summary>"recursive", set with number to recurse for a specified time or truthy value to recurse indefinitely. Only recognized when "list" is specified.</summary>

#### Example

Recurse folder once.

```
GET http://example.com/?list&recurse=1
```

response:

```json
[
	{
		"mimeType": "application/vnd.google-apps.folder",
		"path": "/test/",
		"url": "http://example.com/test/",
		"id": "1JFE64puRxwB3MdasFrumhTFYcFxJiN4Z"
	},
	{
		"mimeType": "text/plain",
		"path": "/test/no.txt",
		"url": "http://example.com/test/no.txt",
		"id": "1--ZX0dbRcpw1JItDMIKNIBl9Ej1g12sG",
		"size": "28592"
	},
	{
		"mimeType": "text/plain",
		"path": "/text.txt",
		"url": "http://example.com/text.txt",
		"id": "13FmU4rGY2j5NLmzW0cmxetlHvYpF0eET",
		"size": "18848"
	}
]
```

</details>

<details>
<summary>"nofile" or "nofolder", hide file or folder respectively. Only recognized when "list" is specified.</summary>

#### Example

List, but without folders.

```
GET http://example.com/?list&nofolder
```

response:

```json
[
	{
		"mimeType": "text/plain",
		"path": "/text.txt",
		"url": "http://example.com/text.txt",
		"id": "13FmU4rGY2j5NLmzW0cmxetlHvYpF0eET",
		"size": "18848"
	}
]
```

</details>

### `POST`

Post is used to upload files using `multipart/form-data`, either from URL or from your machine. Examples below will be using cURL.

<details>
<summary>Upload from URL</summary>

> Required form:
>
> - `mode`: upload mode, set with `urlupload`.
> - `url`: url of the content you wish to upload.
>
> Optional form:
>
> - `path`: folder path to save the content (default to `/`)
> - `filename`: saved filename (default to url's last segment)

#### Example

Upload file from `https://images.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg` to folder `/private/cat` with name `cat.jpeg`.

```
curl --request POST http://example.com \
  -F "mode=urlupload" \
  -F "url=https://images.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg" \
  -F "path=/private/cat" \
  -F "filename=cat.jpeg"
```

</details>

<details>
<summary>Upload from local file</summary>

> Required form:
>
> - `mode`: upload mode, set with `fileupload`.
> - `file`: the file.
>
> Optional form:
>
> - `path`: folder path to save the content (default to `/`)
> - `filename`: saved filename (default to file's filename)

#### Example

Upload `mycat.jpeg` to folder `/private/cat` with name `cat.jpeg`.

```
curl --request POST http://example.com \
  -F "mode=fileupload" \
  -F "file=@mycat.jpeg" \
  -F "path=/private/cat" \
  -F "filename=cat.jpeg"
```

</details>

#### Search query

- "create", create `path` folder if not exists (including parent folders).

## Getting `refresh_token`

1. Install [rclone](https://rclone.org/downloads/).

2. Create your own [Google Drive client_id](https://rclone.org/drive/#making-your-own-client-id).

3. Create a [Google Drive remote](https://rclone.org/drive/#configuration) in rclone and fill in `client_id` and `client_secret` with the one you made before.

4. Copy the `refresh_token` in this step (it's the last step).

```
...
[remote]

client_id =
client_secret =
scope = drive
root_folder_id =
service_account_file =
token = {"access_token":"XXX","token_type":"Bearer","refresh_token":"XXX","expiry":"2014-03-16T13:57:58.955387075Z"}
---

y) Yes this is OK
e) Edit this remote
d) Delete this remote
...
```
