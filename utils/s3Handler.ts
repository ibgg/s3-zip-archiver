import * as AWS from 'aws-sdk';
import { Stream } from 'stream';

const S3 = new AWS.S3();
const ARCHIVE_CONTENT_TYPE = 'application/zip';

class S3Handler {
  constructor() { }

  async fileExists(Bucket: string, Key: string) {
	try {
		await S3.headObject({ Bucket, Key }).promise();
		return true;
	  } catch (error) {
		if (error.statusCode === 404 || error.code === "NotFound") {
			console.log('File Not Found!');
			error.errorMessage = "File not found: " + Key;
		}
		throw error;
	  }
  }

  readStream(Bucket: string, Key: string) {
    return S3.getObject({ Bucket, Key }).createReadStream()
  }

  writeStream(Bucket: string, region: string, Key: string) {
    const streamPassThrough = new Stream.PassThrough();

    const params: AWS.S3.PutObjectRequest = {
      ACL: 'private',
      Body: streamPassThrough,
	  Bucket,
	  region,
      ContentType: ARCHIVE_CONTENT_TYPE,
	  Key
	};
	
    return {
      s3StreamUpload: streamPassThrough,
      uploaded: S3.upload(params, (error: Error): void => {
        if (error) {
          console.error(`Got error creating stream to s3 ${error.name} ${error.message} ${error.stack}`);
          throw error;
        }
      })
    }
  }
}

export const s3Handler = new S3Handler();
