import { createHash, randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EvidenceUploadResult } from '@tgim/shared';

const localObjects = new Map<string, { body: Buffer; contentType: string }>();
const execFileAsync = promisify(execFile);

function s3Client(): S3Client | null {
  if (!process.env.S3_BUCKET) return null;
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    } : undefined,
  });
}

export async function storeEvidence(input: { filename: string; media_type: string; base64: string; sha256?: string }, apiOrigin: string): Promise<EvidenceUploadResult> {
  const original = Buffer.from(input.base64, 'base64');
  if (original.length === 0 || original.length > 12 * 1024 * 1024) throw new Error('Evidence must be between 1 byte and 12 MB');
  const hash = createHash('sha256').update(original).digest('hex');
  if (input.sha256 && input.sha256 !== hash) throw new Error('Evidence checksum mismatch');
  const id = randomUUID();
  let processedBody: Buffer;
  let processedType: string;
  let extension: string;
  let width = 0;
  let height = 0;
  if (input.media_type === 'video/mp4') {
    const source = join(tmpdir(), `${id}-source.mp4`);
    const output = join(tmpdir(), `${id}-public.mp4`);
    try {
      await writeFile(source, original);
      await execFileAsync('ffmpeg', ['-y', '-i', source, '-map_metadata', '-1', '-c:v', process.env.FFMPEG_VIDEO_CODEC || 'mpeg4', '-q:v', '6', '-c:a', 'aac', '-movflags', '+faststart', output]);
      processedBody = await readFile(output);
    } finally {
      await Promise.allSettled([unlink(source), unlink(output)]);
    }
    processedType = 'video/mp4'; extension = 'mp4';
  } else {
    const processed = await sharp(original, { failOn: 'warning' }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    processedBody = processed.data; processedType = 'image/webp'; extension = 'webp'; width = processed.info.width; height = processed.info.height;
  }
  const originalKey = `private/originals/${id}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const publicKey = `public/evidence/${id}.${extension}`;
  const client = s3Client();
  let mediaUrl: string;
  if (client && process.env.S3_BUCKET) {
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: originalKey, Body: original, ContentType: input.media_type, Metadata: { sha256: hash } }));
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: publicKey, Body: processedBody, ContentType: processedType, CacheControl: 'public, max-age=31536000, immutable', Metadata: { source_sha256: hash } }));
    const publicBase = process.env.S3_PUBLIC_BASE_URL;
    if (!publicBase) throw new Error('S3_PUBLIC_BASE_URL is required when S3_BUCKET is configured');
    mediaUrl = `${publicBase.replace(/\/$/, '')}/${publicKey}`;
  } else {
    localObjects.set(id, { body: processedBody, contentType: processedType });
    localObjects.set(originalKey, { body: original, contentType: input.media_type });
    mediaUrl = `${apiOrigin.replace(/\/$/, '')}/api/v1/media/${encodeURIComponent(id)}.${extension}`;
  }
  return { media_url: mediaUrl, media_type: processedType, media_hash: hash, width, height, bytes: processedBody.length };
}

export function readLocalEvidence(id: string) {
  return localObjects.get(id) ?? null;
}
