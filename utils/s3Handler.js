const AWS = require ("aws-sdk");
const Stream = require("stream");

const S3 = new AWS.S3();
const ARCHIVE_CONTENT_TYPE = 'application/zip';

class S3Handler {
  constructor() { }

  readStream(Bucket, Key) {
    return S3.getObject({ Bucket, Key }).createReadStream()
  }

  writeStream(Bucket, region, Key) {
    const streamPassThrough = new Stream.PassThrough();

    const params = {
      ACL: 'private',
      Body: streamPassThrough,
	  Bucket,
	  region,
      ContentType: ARCHIVE_CONTENT_TYPE,
	  Key
	};
	
    return {
      s3StreamUpload: streamPassThrough,
      uploaded: S3.upload(params, (error) => {
        if (error) {
          console.error(`Got error creating stream to s3 ${error.name} ${error.message} ${error.stack}`);
          throw error;
        }
      })
    }
  }
}

module.exports = S3Handler;