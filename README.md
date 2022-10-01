# cloudflare-gdrive

Use Google Drive as File Server on Cloudflare Workers ([register here](https://dash.cloudflare.com/sign-up)).

## Setup

0. [Get Google drive oauth codes](#getting-google-drive-oauth-codes)

This will be used later, save it somewhere else after you got them.

1. Install and authorize [wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/) if you have not already

```bash
# install
npm install --global wrangler

# authorize
wrangler login
```

2. Initialize a module worker

```bash
# cd my-worker
wrangler init -y
```

3. Install `cloudflare-gdrive`

```bash
npm install cloudflare-gdrive
```

4. Open `src/index.ts` and put `cloudflare-gdrive`'s `handle` like so

Use the Google drive oauth codes from [step 0](#getting-google-drive-oauth-codes) as `oauth` options.

> See `CloudflareGdriveOptions` JSDoc at [`./src/types.ts`](./src/types.ts) for options references.

```ts
import { handle } from 'cloudflare-gdrive'

export default {
  fetch: handle({
    // options here
  }),
}
```

5. Publish!

```bash
wrangler publish
```

## Usage

What this package does is basically map the url's paths into their Google drive's path and return their metadata _by default_. However, you could also do the _actions_ listed below using search queries:

- [Downloading](#downloading)
- [Listing](#listing)

> See `CloudflareGdriveResponse` JSDoc at [`./src/types.ts`](./src/types.ts) for response references.

### Downloading

Use `download=1` search query. Returns the file if it's downloadable or else returns an error.

### Listing (directory)

Use `list=1` search query or `listrecursive=1` to list recursively, `listrecursive=1` implies `list=1` so you don't need to specify both if you want to list recursively. Returns `CloudflareGdriveResponse` if the path is a Google drive's folder or else return an error.

## Getting Google drive oauth codes

This guide is intended for those who does not have Google drive oauth codes, feel free to skip this step if you already have one.

1. Clone this repository

```bash
git clone https://github.com/Aynh/cloudflare-gdrive.git --depth 1
```

2. Goto `local-google-drive-auth` folder

```bash
cd local-google-drive-auth
```

3. Install dependencies

```bash
yarn
```

4. Run the server

> It will open a web browser automatically for you.

```bash
yarn dev
```

5. Authorize your account

Authorize your Google account normally.

6. Get them codes

After authorizing your account you will be redirected back and get your oauth codes.

7. Done

Feel free to close the server and copy/save your codes.
