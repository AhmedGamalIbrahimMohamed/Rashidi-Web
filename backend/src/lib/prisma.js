import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * A single Prisma client for the process. `globalThis` caching keeps
 * `node --watch` from opening a new pool on every reload in development.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__rashidiPrisma ??
  new PrismaClient({
    log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!env.isProduction) globalForPrisma.__rashidiPrisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
