import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { env } from '../../config/env.js';
import { localDriver } from './local-driver.js';
import { s3Driver } from './s3-driver.js';

/**
 * Single entry point for file persistence. Callers never know which backend is
 * active, so moving from disk to a bucket is a one-line env change.
 */
export const storage = env.storage.driver === 's3' ? s3Driver : localDriver;

/** Builds a collision-proof object key: `machines/<id>/<uuid>-main.webp`. */
export function buildKey(folder, filename) {
  const extension = path.extname(filename) || '';
  const base = path
    .basename(filename, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${folder}/${randomUUID()}${base ? `-${base}` : ''}${extension}`;
}

export async function initStorage() {
  await storage.init();
}
