import sharp from 'sharp';
import { env } from '../config/env.js';
import { buildKey, storage } from './storage/index.js';

const { fullWidth, thumbWidth, quality } = env.uploads;

/**
 * Turns an uploaded buffer into three web-ready assets:
 *
 *   1. a capped-width WebP for the gallery / details hero,
 *   2. a 640px WebP thumbnail for cards and lazy grids,
 *   3. a 20px base64 LQIP embedded in the API response for blur-up loading.
 *
 * WebP is used across the board: ~30% smaller than JPEG at the same perceived
 * quality and supported by every browser the site targets.
 */
export async function processMachineImage(file, folder) {
  const pipeline = sharp(file.buffer, { failOn: 'none' }).rotate(); // honour EXIF orientation
  const metadata = await pipeline.metadata();

  const [fullBuffer, thumbBuffer, blurBuffer] = await Promise.all([
    pipeline
      .clone()
      .resize({ width: fullWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer(),
    pipeline
      .clone()
      .resize({ width: thumbWidth, withoutEnlargement: true })
      .webp({ quality: quality - 6 })
      .toBuffer(),
    pipeline.clone().resize({ width: 20 }).webp({ quality: 40 }).toBuffer(),
  ]);

  const baseName = file.originalname || 'image';
  const fullKey = buildKey(folder, `${baseName.replace(/\.[^.]+$/, '')}.webp`);
  const thumbKey = fullKey.replace(/\.webp$/, '-thumb.webp');

  const [full, thumb] = await Promise.all([
    storage.put(fullKey, fullBuffer, { contentType: 'image/webp' }),
    storage.put(thumbKey, thumbBuffer, { contentType: 'image/webp' }),
  ]);

  // Width/height after the resize, so the frontend can reserve layout space.
  const scale = metadata.width && metadata.width > fullWidth ? fullWidth / metadata.width : 1;

  return {
    url: full.url,
    storageKey: full.key,
    thumbnailUrl: thumb.url,
    thumbnailKey: thumb.key,
    width: metadata.width ? Math.round(metadata.width * scale) : null,
    height: metadata.height ? Math.round(metadata.height * scale) : null,
    blurDataUrl: `data:image/webp;base64,${blurBuffer.toString('base64')}`,
  };
}

/** Stores a non-image file (spec sheets, manuals) untouched. */
export async function storeDocument(file, folder) {
  const key = buildKey(folder, file.originalname || 'document');
  const stored = await storage.put(key, file.buffer, { contentType: file.mimetype });
  return {
    url: stored.url,
    storageKey: stored.key,
    mimeType: file.mimetype,
    fileSize: file.size,
  };
}
