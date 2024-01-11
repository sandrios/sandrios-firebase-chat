import {
  PutObjectCommand,
  DeleteObjectCommand,
  ServerSideEncryption,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";

import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import {
  onCall,
} from "firebase-functions/v2/https";

import {getS3Client} from "./s3";

export const getS3SignedUrlUpload = onCall(async (request) => {
  const command = new PutObjectCommand({
    Bucket: request.data.S3BucketName,
    Key: request.data.key,
    ACL: ObjectCannedACL.public_read,
    ServerSideEncryption: ServerSideEncryption.AES256,
  });

  try {
    const response = await getSignedUrl(
      getS3Client(),
      command,
      {expiresIn: 3600},
    );
    return response;
  } catch (err) {
    console.error(err);
    return err;
  }
});

export const deleteS3Object = onCall(async (request) => {
  const command = new DeleteObjectCommand({
    Bucket: request.data.S3BucketName,
    Key: request.data.key,
  });

  try {
    await getS3Client().send(command);
  } catch (err) {
    console.error(err);
  }
});
