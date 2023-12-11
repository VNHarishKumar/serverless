# serverless

# Lambda Function setup

Install the required npm packages

- Google cloud storage
- aws-sdk
- axios 

To run the Lambda function

- Get the reuquired values from the IAC code as environment variables for Google cloud storage and amazon ses
- Get the mailId for the mail need to be sent and the url to be stored in Google bucket as SNS message 
- Split the message according to the information needed to be used
- Check the url and store he content in the bucket
- Send mail if able to save in bucket or unable to save in bucket
- Track the mail sent in DynamoDb
