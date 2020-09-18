# s3-zip-archiver

This project deploys Lambda Functions for files compression from Amazon S3.
Some features implemented in this project:
- AWS S3 Bucket creation and setup
- Creation and setup for new Role used in Lambda Functions.
- Lambda Function dispatcher setup and deployment.
- Lambda Function archiver setup and deployment.
- REST API Gateway setup and creation exposing a POST method.

## Project Setup:
1. Install nodejs >12.04
2. Install and configure AWS CLI in your local environment (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
3. Edit file setup.sh including your AWS USERID.
4. Run setup.sh: `./setup.sh`
5. This script is going to ask you for these parameters during the execution, and you must copy & paste theses from the output console: 
	- API ID
	- parent id
	- resource id
6. At the end, you're going to get the final url endpoint, you must make a POST call.
7. Here is the CURL request:
`
curl -0 -v -X POST https://40tw838ea2.execute-api.us-east-1.amazonaws.com/prod/files-archiver \
  -H "Expect:" \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d @s3-test.json
`

## Project customization
If you want to update the project, you can set the following parameters in setup.sh:
* Region [$REGION]
* Bucket name [$e2m2m-digtracker]
* Role name [$digtracker-lambdas3]
* Policy name [$SNS_POLICY_NAME]
* Archiver lambda function name [$ARCHIVER_FUNCTION_NAME]
* Dispatcher lambda function name [$DISPATCHER_FUNCTION_NAME]
* Errors SNS name [$ERRORS_ARCHIVER_SNS_NAME]
* Timeout [$TIMEOUT]
* Memory size [$MEMORY_SIZE]
* API Gateway name [$API_GATEWAY_NAME]
* API_GATEWAY_DESCRIPTION [$API_GATEWAY_DESCRIPTION]
* Rest resource name [$REST_RESOURCE_NAME]
* Stage name [$STAGE_NAME]