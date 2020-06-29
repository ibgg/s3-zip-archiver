import Archiver from 'archiver';
import { Readable } from 'stream';
import path from 'path';
import { successResponse, s3Handler } from './utils';

type S3DownloadStreamDetails = { stream: Readable; filename: string };

interface Zip {
	keys: string[];
	archiveFileName: string;
	archiveFolderPath: string;
	archiveFormat: Archiver.Format;
}

class ZipHandler {
	keys: string[];
	archiveFileName: string;
	archiveFolderPath: string;
	archiveFormat: Archiver.Format;
	constructor(keys: string[], archiveFileName: string, archiveFolderPath: string, archiveFormat: Archiver.Format) {
		this.keys = keys;
		this.archiveFileName = archiveFileName;
		this.archiveFolderPath = archiveFolderPath;
		this.archiveFormat = archiveFormat;
	}

	s3DownloadStreams(): S3DownloadStreamDetails[] {
		return this.keys.map((key: string) => {
			//let _fname = `${path.basename(key)}`;
			return {
				stream: s3Handler.readStream(process.env.BUCKET, key),
				filename: `${path.basename(key)}`,
			};
		});
	}

	async process() {
		let _fname = `${this.archiveFolderPath}/${this.archiveFileName}`;
		const { s3StreamUpload, uploaded } = s3Handler.writeStream(process.env.BUCKET, process.env.REGION, _fname);
		const s3DownloadStreams = this.s3DownloadStreams();

		await new Promise((resolve, reject) => {
			const archive = Archiver(this.archiveFormat);
			archive.on('error', (error: Archiver.ArchiverError) => {
				throw new Error(`${error.name} ${error.code} ${error.message} ${error.path} ${error.stack}`);
			});

			s3StreamUpload.on('close', function (){
				console.log("here in on close");
				resolve();
			});
			s3StreamUpload.on('end', function (){
				console.log("here in on end");
				resolve();
			});
			s3StreamUpload.on('error', reject);
			s3StreamUpload.on('httpUploadProgress', (progress: { loaded: number; total: number; part: number; key: string }): void => {
				console.log(progress); // { loaded: 4915, total: 192915, part: 1, key: 'foo.jpg' }
			});

			archive.pipe(s3StreamUpload);
			s3DownloadStreams.forEach((streamDetails: S3DownloadStreamDetails) => {
				archive.append(streamDetails.stream, { name: streamDetails.filename })});
			archive.finalize();
		}).catch((error: { code: string; message: string; data: string }) => {
			throw new Error(`${error.code} ${error.message} ${error.data}`);
		});

		await uploaded.promise();
		console.log('done');
	}
}

export const handler: Function = async (event: Zip) => {
  console.time('zipProcess');
  console.log(event);

  const { keys, archiveFileName, archiveFolderPath, archiveFormat } = event;

  const zipHandler = new ZipHandler(keys, archiveFileName, archiveFolderPath, archiveFormat);
  await zipHandler.process();

  const response = successResponse({
    message: `${archiveFolderPath}/${archiveFileName}`
  });

  console.timeEnd('zipProcess');
  return response;
}