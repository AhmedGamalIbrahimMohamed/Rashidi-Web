/**
 * Production entry point for hosts that just run `node <entry>` (Hostinger).
 *
 * Applies pending migrations, seeds the catalogue on a brand-new database, then
 * starts the API. Seeding only runs while there are no users, so redeploys
 * never overwrite content edited from the dashboard.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const run = (args) => execFileSync(process.execPath, args, { stdio: 'inherit' });

// No top-level await: Hostinger's LiteSpeed runner loads the entry with
// require(), which rejects ES modules that use it.
async function boot() {
  run([prismaCli, 'migrate', 'deploy', '--schema', fromRoot('prisma/schema.prisma')]);

  const { prisma } = await import('./lib/prisma.js');
  if ((await prisma.user.count()) === 0) run([fromRoot('prisma/seed.js')]);

  await import('./server.js');
}

boot().catch((error) => {
  console.error('\nFailed to boot:\n', error);
  process.exit(1);
});
