#!/bin/bash

USERID=""
REGION="us-east-1"

BUCKET_NAME="image-compressor-ibgg22"
ROLE_NAME="s3-compressor_1"

FUNCTION_NAME="s3-compressor"

API_GATEWAY_NAME="S3-ARCHIVER"
API_GATEWAY_DESCRIPTION="This api archives files in s3"
REST_RESOURCE_NAME="files-archiver"
STAGE_NAME="prod"
STATEMENT_TEST_ID="apigateway-test-$REST_RESOURCE_NAME"
STATEMENT_PROD_ID="apigateway-prod-$REST_RESOURCE_NAME"
TIMEOUT=120

echo ":::::::AWS S3 Zip archiver:::::::"

#Cleaning previous javascript generated files from typescript
#echo "Cleaning previous setup"
#rm index.js utils/*.js function.zip

#Installing required dependences
echo "Installing dependences..."
npm install archiver

#Compiling typescript files
echo "Compiling typescript file..."
tsc

# zip function
echo "Zipping function and dependences"
 zip -r function.zip index.js utils/*.js node_modules 

#Set region in aws cli
echo "Settin region $REGION.."
aws configure set region $REGION

#Creating new bucket
echo "Create new bucket $BUCKET_NAME..."
aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION

#Creating new role
echo "Creating new role $ROLE_NAME..."
aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file://trust-policy.json

# Attach the permissions policy (in this example a managed policy) to the role to specify what it is allowed to do.
echo "Attaching permissions policy to role $ROLE_NAME created"
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AWSLambdaExecute

#Create function
echo "Creating lambda function $FUNCTION_NAME..."
aws lambda create-function --function-name arn:aws:lambda:$REGION:$USERID:function:$FUNCTION_NAME --zip-file fileb://function.zip --handler index.handler --runtime nodejs12.x --role arn:aws:iam::$USERID:role/$ROLE_NAME

#Update function to set environment variables and timeout
echo "Updating function to set environment variables: $BUCKET_NAME and $REGION and TIMEOT to $TIMEOUT"
aws lambda update-function-configuration --function-name $FUNCTION_NAME --environment "Variables={BUCKET=$BUCKET_NAME, REGION=$REGION}" --timeout $TIMEOUT

#Create API REST gateway
# Documentación https://docs.aws.amazon.com/es_es/lambda/latest/dg/services-apigateway-tutorial.html
echo "Create API REST gateway.. $API_GATEWAY_NAME"
aws apigateway create-rest-api --name $API_GATEWAY_NAME --description "This api archives files in s3"

#Requesting for Generated API ID
echo "Please paste generated API ID.."
read API_ID

#GET API Resources $API_ID
echo "Printing generated resource for $API_ID..."
aws apigateway get-resources --rest-api-id $API_ID

#Requesting for resource parent id
echo "Please paste parent id for generated resource in $API_ID..."
read PARENT_ID

#Create REST resource 
echo "Creating resource for next post method $REST_RESOURCE_NAME..."
aws apigateway create-resource --rest-api-id $API_ID  --path-part $REST_RESOURCE_NAME --parent-id $PARENT_ID

echo "Please paste generated resource id..."
read RESOURCE_ID

#Creación del método post
echo 'Generating POST method for $RESOURCE_ID...'
aws apigateway put-method --rest-api-id $API_ID --resource-id $RESOURCE_ID \--http-method POST --authorization-type NONE

# Defining lambda target
echo "Defining lambda $FUNCTION_NAME target for invocations..."
aws apigateway put-integration --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method POST --type AWS --integration-http-method POST --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$USERID:function:$FUNCTION_NAME/invocations

# Setting POST response as JSON type
echo "Seting response to JSON type"
aws apigateway put-method-response --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method POST --status-code 200 --response-models application/json=Empty

# Setting lambda response to API Gateway JSON Type  Para establecer la respuesta de integración del método POST en JSON. Este es el tipo de respuesta que devuelve la función de Lambda.
echo "Setting lambda $FUNCTION_NAME response type to JSON..."
aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method POST --status-code 200 --response-templates application/json=""

#Implementar la API
echo "Setting API stage..."
aws apigateway create-deployment --rest-api-id $API_ID --stage-name $STAGE_NAME

#Setting API invocations grants
echo "Setting API invocations grants using statement: $STATEMENT_TEST_ID..."
aws lambda add-permission --function-name $FUNCTION_NAME --statement-id $STATEMENT_TEST_ID --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$REGION:$USERID:$API_ID/*/POST/$REST_RESOURCE_NAME"

#Ahora, ejecute el mismo comando de nuevo, pero esta vez conceda a la API implementada permisos para invocar la función de Lambda. PROD
#Setting API invocations grants for prod
echo "Setting API invocations grants in prod $STATEMENT_PROD_ID..."
aws lambda add-permission --function-name $FUNCTION_NAME --statement-id $STATEMENT_PROD_ID  --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$REGION:$USERID:$API_ID/$STAGE_NAME/POST/$REST_RESOURCE_NAME"
