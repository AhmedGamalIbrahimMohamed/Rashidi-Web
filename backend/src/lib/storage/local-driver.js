import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';

const root = path.resolve(process.cwd(), env.storage.local.directory);

/**
 * Filesystem driver. Good enough for a single-server deployment and for local
 * development; swap STORAGE_DRIVER to `s3` for horizontal scaling / CDN.
 */
export const localDriver = {
  name: 'local',

  async init() {
    await fs.mkdir(root, { recursive: true });
  },

  async put(key, buffer) {
    const destination = path.join(root, key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, buffer);
    return { key, url: this.url(key) };
  },

  async delete(key) {
    if (!key) return;
    // Never let a crafted key escape the uploads directory.
    const destination = path.resolve(root, key);
    if (!destination.startsWith(root)) return;
    await fs.rm(destination, { force: true });
  },

  url(key) {
    if (!key) return null;
    const encoded = key.split('/').map(encodeURIComponent).join('/');
    return `${env.storage.publicUrl}${env.storage.local.route}/${encoded}`;
  },
};
