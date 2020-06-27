import Archiver from 'archiver';
import { Readable } from 'stream';
import path from 'path';
import { successResponse, errorResponse, s3Handler } from './utils';

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
		try{
			let _fname = `${this.archiveFolderPath}/${this.archiveFileName}`;
			const { s3StreamUpload, uploaded } = s3Handler.writeStream(process.env.BUCKET, process.env.REGION, _fname);
			const s3DownloadStreams = this.s3DownloadStreams();
	
			const verifyFiles = async () => {
				for (let key of this.keys) {
					await s3Handler.fileExists(process.env.BUCKET, key).catch((error) => {
						console.log("Maganged error");
						throw error;
					});
				}
			}
	
			return verifyFiles().then(async () => {
				console.log("here in then1...");
				try {
					await new Promise((resolve, reject) => {
						const archive = Archiver(this.archiveFormat);
						archive.on('error', (error: Archiver.ArchiverError) => {
							throw new Error(`${error.name} ${error.code} ${error.message} ${error.path} ${error.stack}`);
						});
	
						s3StreamUpload.on('close', resolve);
						s3StreamUpload.on('end', resolve);
						s3StreamUpload.on('error', reject);
						s3StreamUpload.on('httpUploadProgress', (progress: { loaded: number; total: number; part: number; key: string; }): void => {
							console.log(progress); // { loaded: 4915, total: 192915, part: 1, key: 'foo.jpg' }
						});
	
						archive.pipe(s3StreamUpload);
						s3DownloadStreams.forEach((streamDetails: S3DownloadStreamDetails) => {
							console.log("trying append file..." + streamDetails.filename);
							archive.append(streamDetails.stream, { name: streamDetails.filename });
						});
						archive.finalize();
					});
					console.log('done');
					return uploaded.promise();
				}
				catch (error_1) {
					throw new Error(`${error_1.code} ${error_1.message} ${error_1.data}`);
				}
			}).catch((error) => {
				console.log("Maganged error!!!!!!!!!");
				//return Promise.reject(error);
				throw error;
			});
		}catch(error){
			console.error("error just here...");
		}
	}
}

export const handler: Function = async (event: Zip) => {
	console.time('zipProcess');
	console.log(event);

	const { keys, archiveFileName, archiveFolderPath, archiveFormat } = event;

	const zipHandler = new ZipHandler(keys, archiveFileName, archiveFolderPath, archiveFormat);

	try{
		await zipHandler.process();

		const response = successResponse({
			message: archiveFileName
		});
	
		console.timeEnd('zipProcess');
		return response;
	}catch(error) {
		console.log("Finally here!!");
		console.error("ERRRROR:"+JSON.stringify(error));
		const response = errorResponse({
			message: error
		});
	
		console.timeEnd('zipProcess');
		return response;	
	}
	
}