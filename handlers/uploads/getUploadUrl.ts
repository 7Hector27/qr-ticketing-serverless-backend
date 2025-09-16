import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";

const s3 = new S3Client({ region: process.env.AWS_REGION });

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { fileType, fileName } = JSON.parse(event.body ?? "{}");

    if (!fileType || !ALLOWED_TYPES.includes(fileType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid file type" }),
      };
    }

    // build a safe key
    const ext = fileType.split("/")[1]; // "jpeg" | "jpg" | "png"
    const name = fileName ? fileName.replace(/\s+/g, "_") : `upload_${uuid()}`;
    const key = `events/${uuid()}_${name}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: fileType,
      // If you plan to use public-read objects via ACLs, you'd add:
      // ACL: "public-read",  // requires disabling "Block Public ACLs" (not recommended)
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    // Public URL if bucket is public; otherwise this is a private object path (use CloudFront or signed GET)
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl, fileUrl, key }),
    };
  } catch (err: any) {
    console.error("getUploadUrl error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
