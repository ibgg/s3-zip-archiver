#!/bin/bash

USERID="" #Write here your userID
REGION="us-east-1"

BUCKET_NAME="e2m2m-digtracker"
ROLE_NAME="digtracker-lambdas3"

ARCHIVER_FUNCTION_NAME="files-archiver"
DISPATCHER_FUNCTION_NAME="lambda-dispatcher"

API_GATEWAY_NAME="S3-FILES-ARCHIVER"
API_GATEWAY_DESCRIPTION="This api archives files in s3"
REST_RESOURCE_NAME="files-archiver"
STAGE_NAME="prod"
STATEMENT_TEST_ID="apigateway-test-$REST_RESOURCE_NAME"
STATEMENT_PROD_ID="apigateway-prod-$REST_RESOURCE_NAME"
TIMEOUT=600
MEMORY_SIZE=512

echo "::::::::::::::AWS S3 FILES ARCHIVER::::::::::::::"

#Installing required dependences
echo "Installing nodejs dependences for archiver lambda function $ARCHIVER_FUNCTION_NAME..."
cd ./files-archiver
npm install

# zip function
echo "Zipping $ARCHIVER_FUNCTION_NAME lambda function  and dependences..."
zip -r function.zip index.js utils/*.js node_modules 
cd ..

# zip function
echo "Zipping $DISPATCHER_FUNCTION_NAME lambda function  and dependences..."
cd ./lambda-dispatcher
zip function.zip index.js
cd ..

#Set region in aws cli
echo "Settin region $REGION..."
aws configure set region $REGION

#Creating new bucket
echo "Create new bucket $BUCKET_NAME..."
aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION

#Creating new role
echo "Creating new role for lambda functions $ROLE_NAME..."
aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file://trust-policy.json

# Attach the permissions policy (in this example a managed policy) to the role to specify what it is allowed to do.
echo "Attaching permissions policy to role $ROLE_NAME created..."
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AWSLambdaExecute
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaRole

#Create function
echo "Creating lambda function $ARCHIVER_FUNCTION_NAME..."
aws lambda create-function --function-name arn:aws:lambda:$REGION:$USERID:function:$ARCHIVER_FUNCTION_NAME --zip-file fileb://$ARCHIVER_FUNCTION_NAME/function.zip --handler index.handler --runtime nodejs12.x --role arn:aws:iam::$USERID:role/$ROLE_NAME

#Update function to set environment variables and timeout
echo "Updating function to set environment variables: Bucket name: $BUCKET_NAME, Memory size: $MEMORY_SIZE, Region: $REGION and TIMEOT: $TIMEOUT..."
aws lambda update-function-configuration --function-name $ARCHIVER_FUNCTION_NAME --environment "Variables={BUCKET=$BUCKET_NAME, REGION=$REGION}" --timeout $TIMEOUT --memory-size $MEMORY_SIZE

#Create function
echo "Creating dispatcher lambda function $DISPATCHER_FUNCTION_NAME..."
aws lambda create-function --function-name arn:aws:lambda:$REGION:$USERID:function:$DISPATCHER_FUNCTION_NAME --zip-file fileb://$DISPATCHER_FUNCTION_NAME/function.zip --handler index.handler --runtime nodejs12.x --role arn:aws:iam::$USERID:role/$ROLE_NAME

#Create API REST gateway
# Doc https://docs.aws.amazon.com/es_es/lambda/latest/dg/services-apigateway-tutorial.html
echo "Create API REST gateway $API_GATEWAY_NAME..."
aws apigateway create-rest-api --name $API_GATEWAY_NAME --description "This api archives files in s3"

#Requesting for Generated API ID
echo "Please paste generated API ID..."
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
echo "Generating POST method for $RESOURCE_ID..."
aws apigateway put-method --rest-api-id $API_ID --resource-id $RESOURCE_ID \--http-method POST --authorization-type NONE

# Defining lambda target
echo "Defining lambda $DISPATCHER_FUNCTION_NAME target for invocations..."
aws apigateway put-integration --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method POST --type AWS --integration-http-method POST --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$USERID:function:$DISPATCHER_FUNCTION_NAME/invocations

# Setting POST response as JSON type
echo "Seting response to JSON type..."
aws apigateway put-method-response --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method POST --status-code 200 --response-models application/json=Empty

# Setting lambda response to API Gateway JSON Type  Para establecer la respuesta de integración del método POST en JSON. Este es el tipo de respuesta que devuelve la función de Lambda.
echo "Setting lambda $DISPATCHER_FUNCTION_NAME response type to JSON..."
aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method POST --status-code 200 --response-templates application/json=""

#Implementar la API
echo "Setting API stage $STAGE_NAME..."
aws apigateway create-deployment --rest-api-id $API_ID --stage-name $STAGE_NAME

#Setting API invocations grants
echo "Setting API invocations grants using statement: $STATEMENT_TEST_ID..."
aws lambda add-permission --function-name $DISPATCHER_FUNCTION_NAME --statement-id $STATEMENT_TEST_ID --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$REGION:$USERID:$API_ID/*/POST/$REST_RESOURCE_NAME"

#Ahora, ejecute el mismo comando de nuevo, pero esta vez conceda a la API implementada permisos para invocar la función de Lambda. PROD
#Setting API invocations grants for prod
echo "Setting API invocations grants in prod $STATEMENT_PROD_ID..."
aws lambda add-permission --function-name $DISPATCHER_FUNCTION_NAME --statement-id $STATEMENT_PROD_ID  --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$REGION:$USERID:$API_ID/$STAGE_NAME/POST/$REST_RESOURCE_NAME"

echo "::::::::::::::PROCESS COMPLETED::::::::::::::"