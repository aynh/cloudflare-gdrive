import { Request } from 'itty-router';
import { ThrowableRouter, error, json, missing } from 'itty-router-extras';

import { createGDrive, GDrive, GoogleDriveItem } from './gdrive';

interface IRequest extends Request {
	gdrive: GDrive;
	headers: Headers;
	item: GoogleDriveItem;
	path: string;
}

const router = ThrowableRouter();

const authorize = (request: IRequest, environment: Environment) => {
	if (environment.BEARER_TOKEN !== undefined) {
		const authHeader = request.headers.get('Authorization');

		const regex = /(^Bearer )(?<token>.*)/;
		const bearerToken = authHeader?.match(regex)?.groups?.token;
		if (bearerToken === undefined || bearerToken !== environment.BEARER_TOKEN) {
			return error(
				403,
				'please provide a valid bearer token in Authorization header'
			);
		}
	}
};

const initialize = async (request: IRequest, environment: Environment) => {
	const url = new URL(request.url);
	const gdrive = await createGDrive(environment);

	// remove leading and trailing '/'
	const path = url.pathname.replace(/^\/|\/$/g, '');

	const item = await gdrive.resolvePath(path);
	if (item === undefined) {
		return missing(`path '${path}' does not exist.`);
	}

	request.gdrive = gdrive;
	request.item = item;
	request.path = path;
};

router.get('*', initialize, async ({ gdrive, item, path }: IRequest) => {
	return gdrive.isFolder(item)
		? error(400, `path '${path}' is a folder, refusing to download.`)
		: new Response(await gdrive.fetchItem(item.id, true));
});

const transformItem = (
	{ name, mimeType, ...rest }: GoogleDriveItem,
	{ gdrive, path, url }: Pick<IRequest, 'gdrive' | 'path' | 'url'>
) => {
	const url_ = new URL(url);

	// remove all search parameter
	url_.search = '';

	// only transform if it's not exact path
	if (path !== name) {
		url_.pathname = !url_.pathname.endsWith('/') ? `/${name}` : name;

		if (
			// add trailing slash if it's a folder
			gdrive.isFolder({ mimeType }) &&
			!url_.pathname.endsWith('/')
		)
			url_.pathname += '/';
	}

	return {
		mimeType,
		path: url_.pathname.replace(/^\//, ''),
		url: url_.toString(),
		...rest,
	};
};

router.post(
	'*',
	authorize,
	initialize,
	async ({ gdrive, item, path, url, query }: IRequest) => {
		if (gdrive.isFolder(item)) {
			const recursive_ = query?.recursive;

			// check if they want to recurse with spesific depth
			let recursive: boolean | number = Number.parseInt(recursive_ ?? '');

			// check again if they want to recurse them ALL
			if (Number.isNaN(recursive)) recursive = recursive_ === 'true';

			const folder = query?.folder !== 'false';
			const listing = await gdrive.getListings(item.id, recursive);
			return json(
				listing.files
					.filter((item) => (folder ? true : !gdrive.isFolder(item)))
					.map((item) => transformItem(item, { gdrive, path, url }))
			);
		} else {
			return json([transformItem(item, { gdrive, path, url })]);
		}
	}
);

// catch-all handler
router.all('*', () => missing('empty'));

const fetchHandler: ExportedHandlerFetchHandler<Environment> = (
	request,
	environment,
	context
) => {
	return router.handle(request, environment, context);
};

const worker = {
	fetch: fetchHandler,
} as ExportedHandler<Environment>;

export default worker;
