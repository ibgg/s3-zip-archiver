# s3-zip-archiver

This project deploys Lambda Functions for files compression from Amazon S3.

Some features implemented in this project:
- AWS S3 Bucket creation and setup
- Creation and setup for new Role used in Lambda Functions.
- Lambda Function dispatcher setup and deployment.
- Lambda Function archiver setup and deployment.
- REST API Gateway setup and creation exposing a POST method.

For project setup its necesary:
1. Install and configure AWS CLI in your local environment
2. Edit file setup.sh including your AWS USERID.
3. Run setup.sh: `./setup.sh`