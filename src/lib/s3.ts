import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET ?? "sport-content";

let client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!endpoint) return null;
  if (!client) {
    client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
      },
    });
  }
  return client;
}

export async function ensureBucket(): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e: unknown) {
    const err = e as { name?: string; Code?: string };
    if (err?.name === "NotFound" || err?.Code === "NoSuchBucket") {
      try {
        await c.send(new CreateBucketCommand({ Bucket: bucket }));
      } catch {
        // BucketAlreadyOwnedByYou, etc - ignore
      }
    }
  }
}

export async function putRaw(key: string, body: string | Buffer): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  await c.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: typeof body === "string" ? "application/json" : "application/octet-stream",
    })
  );
  return key;
}

export async function getRaw(key: string): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await res.Body?.transformToString();
    return body ?? null;
  } catch {
    return null;
  }
}
