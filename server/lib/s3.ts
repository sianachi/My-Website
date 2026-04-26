import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type S3Env = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

let cachedClient: S3Client | null = null;
let cachedEnv: S3Env | null = null;

function readEnv(): S3Env {
  if (cachedEnv) return cachedEnv;
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint) throw new Error("S3_ENDPOINT is not set");
  if (!bucket) throw new Error("S3_BUCKET is not set");
  if (!accessKeyId) throw new Error("S3_ACCESS_KEY_ID is not set");
  if (!secretAccessKey) throw new Error("S3_SECRET_ACCESS_KEY is not set");
  const region = process.env.S3_REGION ?? "us-east-1";
  // S3_PUBLIC_URL is the base URL the *browser* uses. May differ from
  // S3_ENDPOINT when MinIO is behind a reverse proxy on the VPS.
  const publicUrl = (process.env.S3_PUBLIC_URL ?? endpoint).replace(/\/$/, "");
  cachedEnv = {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
  return cachedEnv;
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const env = readEnv();
  cachedClient = new S3Client({
    endpoint: env.endpoint,
    region: env.region,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    // MinIO requires path-style addressing unless DNS subdomains are
    // wired per-bucket — keep it on for portability.
    forcePathStyle: true,
  });
  return cachedClient;
}

export function getBucket(): string {
  return readEnv().bucket;
}

export function publicUrl(key: string): string {
  const { publicUrl: base, bucket } = readEnv();
  return `${base}/${bucket}/${encodeKey(key)}`;
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function presignPutUrl(key: string, contentType: string, expiresSeconds = 60): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresSeconds });
}

export async function putObject(
  key: string,
  body: string | Uint8Array,
  contentType: string,
): Promise<void> {
  const client = getClient();
  const bytes =
    typeof body === "string" ? new TextEncoder().encode(body) : body;
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: bytes,
      ContentType: contentType,
      ContentLength: bytes.byteLength,
    }),
  );
}

export async function getObjectAsString(key: string): Promise<string | null> {
  const client = getClient();
  try {
    const result = await client.send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    if (!result.Body) return null;
    return await result.Body.transformToString("utf-8");
  } catch (err) {
    const status =
      typeof err === "object" && err !== null && "$metadata" in err
        ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined;
    if (status === 404) return null;
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

export type ListedObject = {
  key: string;
  size: number;
  lastModified: string | null;
};

export async function listObjects(prefix: string): Promise<ListedObject[]> {
  const client = getClient();
  const out: ListedObject[] = [];
  let continuationToken: string | undefined = undefined;
  while (true) {
    const result: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of result.Contents ?? []) {
      if (!obj.Key) continue;
      out.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
      });
    }
    if (!result.IsTruncated) break;
    continuationToken = result.NextContinuationToken;
    if (!continuationToken) break;
  }
  return out;
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getClient();
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return true;
  } catch (err) {
    const status =
      typeof err === "object" && err !== null && "$metadata" in err
        ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined;
    if (status === 404) return false;
    throw err;
  }
}
