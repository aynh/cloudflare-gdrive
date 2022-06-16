import { fetchAccessToken } from './oauth';

const createGDrive = async (environment: Environment) => {
	const { access_token } = await fetchAccessToken(environment);
	return new GDrive(environment, access_token);
};

// https://developers.google.com/drive/api/v3/reference/files/get#http-request
type GoogleDriveFetchItemFunction = ((
	id: string,
	download?: boolean
) => Promise<GoogleDriveItem>) &
	((id: string, download: true) => Promise<Blob>);

// https://developers.google.com/drive/api/v3/reference/files/list#http-request
interface GoogleDriveFilesV3Parameters {
	fields?: string;
	includeItemsFromAllDrives?: boolean;
	pageSize?: number;
	pageToken?: string;
	q?: string;
	supportsAllDrives?: boolean;
	trashed?: boolean;
	[key: string]: boolean | string | number | undefined;
}

// https://developers.google.com/drive/api/v3/reference/files#resource
interface GoogleDriveItem {
	id: string;
	name: string;
	mimeType: string;
	size: string;
	imageMediaMetadata?: {
		height: number;
		width: number;
		rotation: string;
	};
}

// https://developers.google.com/drive/api/v3/reference/files/list#response
interface GoogleDriveListingResponse {
	nextPageToken?: string;
	files: GoogleDriveItem[];
}

class GDrive {
	readonly #accessToken: string;
	readonly #environment: Environment;

	// https://developers.google.com/drive/api/v3/reference/files#resource
	readonly #fileFields = 'id, name, mimeType, size, imageMediaMetadata';

	#records: Record<string, GoogleDriveListingResponse> = {};

	constructor(environment: Environment, accessToken: string) {
		this.#accessToken = accessToken;
		this.#environment = environment;
	}

	#getRecord = (key: string) => {
		return this.#records[key] as GoogleDriveListingResponse | undefined;
	};

	get #headers() {
		return new Headers({ Authorization: `Bearer ${this.#accessToken}` });
	}

	#setRecord = (key: string, value: GoogleDriveListingResponse) => {
		this.#records[key] = value;
	};

	#fetchFilesV3 = async (
		parameters_: GoogleDriveFilesV3Parameters,
		id?: string
	) => {
		const url = new URL(
			`https://www.googleapis.com/drive/v3/files/${id ?? ''}`
		);

		const parameters = {
			supportsAllDrives: true,
			...parameters_,
		} as GoogleDriveFilesV3Parameters;

		for (const [key, value] of Object.entries(parameters)) {
			if (value !== undefined) url.searchParams.append(key, value.toString());
		}

		return fetch(url.toString(), { headers: this.#headers });
	};

	// https://developers.google.com/drive/api/v3/reference/files/get
	// eslint-disable-next-line unicorn/consistent-function-scoping
	fetchItem = (async (id: string, download?: boolean) => {
		const parameters = {} as GoogleDriveFilesV3Parameters;

		if (download === true) {
			parameters.alt = 'media';
		} else {
			parameters.fields = this.#fileFields;
		}

		const response = await this.#fetchFilesV3(parameters, id);

		return download === true
			? response.blob()
			: response.json<GoogleDriveItem>();
	}) as GoogleDriveFetchItemFunction;

	// https://developers.google.com/drive/api/v3/reference/files/list
	fetchListings = async (
		parent = this.#environment.ROOT_FOLDER_ID,
		nextPageToken?: string
	) => {
		const parameters = {
			fields: `nextPageToken, files(${this.#fileFields})`,
			includeItemsFromAllDrives: true,
			nextPageToken,
			pageSize: 1000,
			q: `'${parent}' in parents and trashed = false`,
		};

		const response = await this.#fetchFilesV3(parameters);

		return response.json<GoogleDriveListingResponse>();
	};

	getItem = async (name: string, parent = this.#environment.ROOT_FOLDER_ID) => {
		const record = await this.getListings(parent);

		return record.files.find((item) => name === item.name);
	};

	getListings = async (
		parent = this.#environment.ROOT_FOLDER_ID,
		recursive = false
	) => {
		if (this.#getRecord(parent) === undefined) {
			const result = await this.fetchListings(parent);

			while (result.nextPageToken !== undefined) {
				// eslint-disable-next-line no-await-in-loop
				const next = await this.fetchListings(parent, result.nextPageToken);

				result.files.push(...next.files);
				result.nextPageToken = next.nextPageToken;
			}

			this.#setRecord(parent, result);
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const result = this.#getRecord(parent)!;

		if (recursive) {
			const next = await Promise.all(
				result.files
					.filter(({ mimeType }) => this.isFolder(mimeType))
					.map(({ id }) => this.getListings(id, recursive))
			);

			result.files.push(...next.flatMap(({ files }) => files));
		}

		return result;
	};

	isFolder = (mimeType: string) =>
		mimeType === 'application/vnd.google-apps.folder';

	resolvePath = async (path: string) => {
		if (path === '') {
			return this.fetchItem(this.#environment.ROOT_FOLDER_ID);
		}

		const root = this.#environment.ROOT_FOLDER_ID;
		const parentsId: (string | undefined)[] = [root];
		const items: (GoogleDriveItem | undefined)[] = [];
		for (const [index, subPath] of path.split('/').entries()) {
			const parent = parentsId[index];

			// eslint-disable-next-line no-await-in-loop
			const item = await this.getItem(subPath, parent);

			parentsId.push(item?.id);
			items.push(item);
		}

		return items.at(-1);
	};
}

export {
	createGDrive,
	GDrive,
	GoogleDriveItem,
	GoogleDriveFilesV3Parameters,
	GoogleDriveListingResponse,
};
