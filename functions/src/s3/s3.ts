import {defineString} from "firebase-functions/params";

import {
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Get S3 Client.
 * @return {S3Client} Return S3Client from credentials and region.
 */
export function getS3Client(): S3Client {
  return new S3Client({
    region: defineString("S3_REGION").value(),
    credentials: {
      accessKeyId: defineString("AWS_ACCESS_KEY").value(),
      secretAccessKey: defineString("AWS_SECRET_KEY").value(),
    },
  });
}
