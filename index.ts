import Archiver from 'archiver';
import { Readable } from 'stream';
import path from 'path';
import { successResponse, s3Handler } from './utils';

type S3DownloadStreamDetails = { stream: Readable; filename: string };

interface Zip {
	keys: string[];
	archiveFilePath: string;
	archiveFolderPath: string;
	archiveFormat: Archiver.Format;
}

class ZipHandler {
	keys: string[];
	archiveFilePath: string;
	archiveFolderPath: string;
	archiveFormat: Archiver.Format;
	constructor(keys: string[], archiveFilePath: string, archiveFolderPath: string, archiveFormat: Archiver.Format) {
		this.keys = keys;
		this.archiveFilePath = archiveFilePath;
		this.archiveFolderPath = archiveFolderPath;
		this.archiveFormat = archiveFormat;
	}

	s3DownloadStreams(): S3DownloadStreamDetails[] {
		console.log("ENVIRONMENT BUCKET PROCESS: "+process.env.BUCKET);
		return this.keys.map((key: string) => {
			console.log("Downloading files..." + `${this.archiveFolderPath}\\${path.basename(key)}`);
			return {
				stream: s3Handler.readStream(process.env.BUCKET, key),
				filename: `${this.archiveFolderPath}\\${path.basename(key)}`,
			};
		});
	}

	async process() {
		const { s3StreamUpload, uploaded } = s3Handler.writeStream(process.env.BUCKET, this.archiveFilePath);
		const s3DownloadStreams = this.s3DownloadStreams();

		await new Promise((resolve, reject) => {
			const archive = Archiver(this.archiveFormat);

			console.log("Archiving file... " + this.archiveFilePath);
			archive.on('error', (error: Archiver.ArchiverError) => {
				throw new Error(`${error.name} ${error.code} ${error.message} ${error.path} ${error.stack}`);
			});

			console.log('Starting upload');
			s3StreamUpload.on('close', resolve);
			s3StreamUpload.on('end', resolve);
			s3StreamUpload.on('error', reject);

			archive.pipe(s3StreamUpload);
			s3DownloadStreams.forEach((streamDetails: S3DownloadStreamDetails) => archive.append(streamDetails.stream, { name: streamDetails.filename })
			);
			archive.finalize();
		}).catch((error: { code: string; message: string; data: string }) => {
			console.log("Herror here....");
			throw new Error(`${error.code} ${error.message} ${error.data}`);
		});

		await uploaded.promise().catch((error: { code: string; message: string; data: string }) => {
			console.log("Herror here 2....");
			throw new Error(`${error.code} ${error.message} ${error.data}`);
		});
		console.log('done');
	}
}

export const handler: Function = async (event: Zip) => {
	console.time('zipProcess');
	const { keys, archiveFilePath, archiveFolderPath, archiveFormat } = event;

	console.log("Key parameters: " + JSON.stringify(keys));
	console.log("archiveFilePath: " + archiveFilePath);
	console.log("archiveFolderPath: " + archiveFolderPath);
	console.log("archiveFormat: " + archiveFormat);

	const zipHandler = new ZipHandler(keys, archiveFilePath, archiveFolderPath, archiveFormat);
	await zipHandler.process();

	let responseBody = {
		message: archiveFilePath
	};

	let response = {
		statusCode: 200,
		headers: {
			"x-custom-header": "my custom header value"
		},
		body: JSON.stringify(responseBody)
	};

	console.log("response: " + JSON.stringify(response));

	console.timeEnd('zipProcess');
	return response;
}