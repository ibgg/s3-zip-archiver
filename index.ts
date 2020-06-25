import Archiver from 'archiver';
import { Readable } from 'stream';
import path from 'path';
import { successResponse, runWarm, s3Handler } from './utils';

type S3DownloadStreamDetails = { stream: Readable; filename: string };

interface Zip {
	keys: string[];
	archiveFilePath: string;
	archiveFolderPath: string;
	archiveFormat: Archiver.Format;
}

export const zipHandler: Function = async (event: Zip) => {
	console.time('zipProcess');
	console.log(event);

	// https://stackoverflow.com/q/56188864/2015025
	// Lambda is standalone service that doesn't need to be integrated with API Gateway. queryStringParameters, body, body mapping templates, all of this is specific not to Lambda, but to Lambda - API Gateway integration.
	const { keys, archiveFilePath, archiveFolderPath, archiveFormat } = event;


	let responseBody = {
		message: 'Hello world'
	};

	let response = {
		statusCode: 200,
		headers: {
			"x-custom-header": "my custom header value"
		},
		body: JSON.stringify(responseBody)
	};
	console.log("response: " + JSON.stringify(response))
	return response;
}