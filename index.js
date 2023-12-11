
'use strict';

const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const { Buffer } = require('buffer');
const AWS = require('aws-sdk');
const mailgun = require("mailgun-js");
const AdmZip = require('adm-zip');
// const ses = new AWS.SES();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Decode the base64-encoded service account key
const decodedKey = Buffer.from(process.env.saKey, 'base64').toString('utf-8');
const serviceAccountKey = JSON.parse(decodedKey);

// Create a Google Cloud Storage client with the service account key
const storage = new Storage({
  credentials: {
    project_id:process.env.project_id,
    client_email:process.env.acc_email,
    private_key:serviceAccountKey.private_key,
  },
});

AWS.config.update({ 
  accessKeyId: process.env.accessKeyId,
  secretAccessKey:process.env.secretAccessKey,
  region: process.env.region,
});
const ses = new AWS.SES();


module.exports.handler = async (event) => {

  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('Google key',storage);

  // Assuming 'event' is your JSON object
  const message = event.Records[0].Sns.Message;
  //  const [email, url] = message.split(',');
  const [entriescount,allowed_attempts,deadline,email, url] = message.split(',');
  console.log('Message:', message);
  console.log('Attempt Number',entriescount);
  console.log('Allowed attempts',allowed_attempts);
  console.log('Deadline',deadline);
  console.log('email',email);
  console.log('url',url);


    console.log("Before try block");
  
  try{
    
    const fileName = `${email}${Date.now()}.zip`;

 
  const bucketName = process.env.gcpBucketName;
  const bucket = storage.bucket(bucketName);
 
  
  // Download the file from the URL
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const fileContent = Buffer.from(response.data);


    console.log('File entered try block');
    console.log(fileContent);
  
  // if (fileContent.length > 0) {
  const file = bucket.file(fileName);
  console.log("before await function");
  // await file.save(fileContent);
  await storage.bucket(bucketName).file(fileName).save(fileContent);
  console.log("after await function");

  
  console.log(`File from URL saved in Google Cloud Storage: gs://${bucketName}/${fileName}`);

  

// SES CODE in its own try-catch block

  try {
    console.log("Inside success mail try block");
   
    const sendemail = email;
    const emailParams = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Data: `
          Dear User,

          We like to inform you that the URL you provided is valid and processed. 
          we reviewed the link and it is accurate. We were able to store your work and the attempt will be counted for submissions.
          If you attempt and deadline remaining kindly try to submit again , other wise latest submission will be taken into account.
          You cannot submmit if deadline and attempt is exceded.

          Details:
          - Attempts: ${entriescount}
          - Allowed Attempts: ${allowed_attempts}
          - Deadline for submission: ${deadline}
          - File from URL saved in Google Cloud Storage: ${bucketName}/${fileName}
          
         
          If you have any questions or concerns, please contact your professor or TA.

          Sincerely,
          Submission Team
        `,
          },
        },
        Subject: {
          Data: 'Submission accepted',
        },
      },
      Source: process.env.sourceEmail, // Replace with your SES verified email address
      
    };

     await ses.sendEmail(emailParams).promise();
    console.log('Email sent successfully');

    // var timestamp = Date.now();
    var timestamp = new Date().toISOString();
     // Log to DynamoDB
     const dynamoParams = {
      TableName: process.env.DYNAMO_TABLE_NAME, // Use the DynamoDB table name from environment variables
      Item: {
        EmailId: sendemail,
        Timestamp: timestamp,
        Status: "Success"
        // Add additional attributes as needed
      },
    };
     // Wrap DynamoDB operation in try-catch
     try {
      await dynamoDb.put(dynamoParams).promise();
      console.log('Item added to DynamoDB successfully');
    } catch (dynamoError) {
      console.error('Error adding item to DynamoDB:', dynamoError);
      // Handle DynamoDB error as needed
    }


    // await ses.sendEmail(emailParams).promise();
    // console.log('Email sent successfully');
  } catch (sesError) {
    console.error('Error sending SES email:', sesError.message);
    console.log('Email not sent due to an SES error');
  }   }
   catch (error) {
    try {

      console.log("Inside failure mail try block");

    
    const sendemail = email;
    const emailParams = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Data: `
          Dear User,

          We regret to inform you that the URL you provided is invalid and cannot be processed. 
          Please review the link and ensure it is accurate. We were unable to store your work. But the attempt will be counted for submissions.
          If you attempt and deadline remaining kindly try to submit again , other wise latest submission will be taken into account.
          You cannot submmit if deadline and attempt is exceded.

          Details:
          - Attempts: ${entriescount}
          - Allowed Attempts: ${allowed_attempts}
          - Deadline for submission: ${deadline}
          
         
          If you have any questions or concerns, please contact your professor or TA.

          Sincerely,
          Submission Team
        `,
          },
        },
        Subject: {
          Data: 'Submission Rejected',
        },
      },
      Source: process.env.sourceEmail, // Replace with your SES verified email address
    
    };

    var timestamp = new Date().toISOString();
     // Log to DynamoDB
     const dynamoParams = {
      TableName: process.env.DYNAMO_TABLE_NAME, // Use the DynamoDB table name from environment variables
      Item: {
        EmailId: sendemail,
        Timestamp: timestamp,
        Status: "Failed"
        // Add additional attributes as needed
      },
    };

     await ses.sendEmail(emailParams).promise();
    console.log('Email sent successfully');

     // Wrap DynamoDB operation in try-catch
     try {
      await dynamoDb.put(dynamoParams).promise();
      console.log('Item added to DynamoDB successfully');
    } catch (dynamoError) {
      console.error('Error adding item to DynamoDB:', dynamoError);
      // Handle DynamoDB error as needed
    }

  
  } catch (sesError) {
    console.error('Error sending SES email:', sesError.message);
    console.log('Email not sent due to an SES error');
  }
      console.error('Error downloading and saving the file:', error.message);
    }
 
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };
};



