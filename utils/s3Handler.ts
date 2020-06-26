import * as AWS from 'aws-sdk';
import { Stream } from 'stream';

const S3 = new AWS.S3();
const ARCHIVE_CONTENT_TYPE = 'application/zip';

class S3Handler {
  constructor() { }

  readStream(_Bucket: string, _Key: string) {
    return S3.getObject({ Bucket: _Bucket, Key: _Key }).createReadStream()
  }

  writeStream(_Bucket: string, _Key: string) {
    const streamPassThrough = new Stream.PassThrough();

    const params: AWS.S3.PutObjectRequest = {
      ACL: 'private',
      Body: streamPassThrough,
      Bucket: _Bucket,
      ContentType: ARCHIVE_CONTENT_TYPE,
      Key: _Key,
	};
	
	console.log("Params "+ JSON.stringify(params));

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
