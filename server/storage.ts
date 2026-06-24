// 画像ストレージヘルパ
// 既定: Manus Forge ストレージプロキシ
// STORAGE_PROVIDER=s3 で AWS S3 / S3互換ストレージへ切替可能

import { ENV } from './_core/env';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;
  _s3Client = new S3Client({
    region: ENV.storageS3Region,
    endpoint: ENV.storageS3Endpoint || undefined,
    forcePathStyle: !!ENV.storageS3Endpoint, // MinIO等
    credentials: {
      accessKeyId: ENV.storageS3AccessKeyId,
      secretAccessKey: ENV.storageS3SecretAccessKey,
    },
  });
  return _s3Client;
}

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

async function s3Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.storageS3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const url = ENV.storageS3PublicUrlBase
    ? `${ENV.storageS3PublicUrlBase.replace(/\/$/, "")}/${key}`
    : await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: ENV.storageS3Bucket, Key: key }),
        { expiresIn: 60 * 60 * 24 * 7 }
      );
  return { key, url };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (ENV.storageProvider === "s3") {
    return s3Put(relKey, data, contentType);
  }
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (ENV.storageProvider === "s3") {
    const url = ENV.storageS3PublicUrlBase
      ? `${ENV.storageS3PublicUrlBase.replace(/\/$/, "")}/${key}`
      : await getSignedUrl(
          getS3Client(),
          new GetObjectCommand({ Bucket: ENV.storageS3Bucket, Key: key }),
          { expiresIn: 60 * 60 * 24 * 7 }
        );
    return { key, url };
  }
  const { baseUrl, apiKey } = getStorageConfig();
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
