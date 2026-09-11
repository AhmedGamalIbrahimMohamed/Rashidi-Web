import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

const config = env.storage.s3;

let client = null;
const getClient = () => {
  client ??= new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
};

/**
 * S3-compatible driver — works against AWS S3, Cloudflare R2, DigitalOcean
 * Spaces, Backblaze B2 and MinIO. Objects are written with a long cache header
 * because every key embeds a random id, so a file is never overwritten in place.
 */
export const s3Driver = {
  name: 's3',

  async init() {
    getClient();
  },

  async put(key, buffer, { contentType } = {}) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: this.url(key) };
  },

  async delete(key) {
    if (!key) return;
    await getClient().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  },

  url(key) {
    if (!key) return null;
    const encoded = key.split('/').map(encodeURIComponent).join('/');
    if (config.cdnUrl) return `${config.cdnUrl}/${encoded}`;
    if (config.endpoint) {
      const base = config.endpoint.replace(/\/$/, '');
      return config.forcePathStyle
        ? `${base}/${config.bucket}/${encoded}`
        : `${base}/${encoded}`;
    }
    return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${encoded}`;
  },
};
