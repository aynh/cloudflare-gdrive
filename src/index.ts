import { ThrowableRouter, error, json, missing } from 'itty-router-extras';

import { createGDrive, GDrive, GoogleDriveItem } from './gdrive';

interface IRequest extends Request {
	gdrive: GDrive;
	item: GoogleDriveItem;
	path: string;
}

const router = ThrowableRouter();

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
	return item.mimeType === 'application/vnd.google-apps.folder'
		? error(400, `path '${path}' is a folder, refusing to download.`)
		: gdrive.fetchItem(item.id, true);
});

router.post('*', initialize, async ({ gdrive, item, path, url }: IRequest) => {
	const transformItem = ({ name, ...rest }: GoogleDriveItem) => {
		const url_ = new URL(url);

		if (path !== name)
			url_.pathname += !url_.pathname.endsWith('/') ? `/${name}` : name;

		return { url: url_.toString(), ...rest };
	};

	if (item.mimeType === 'application/vnd.google-apps.folder') {
		const listing = await gdrive.getListings(item.id);
		return json(listing.files.map((item) => transformItem(item)));
	} else {
		return json([transformItem(item)]);
	}
});

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
