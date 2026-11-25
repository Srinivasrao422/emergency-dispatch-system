import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

let prismaInstance = null;
let isDbConnected = false;

export function getPrismaClient() {
  if (!prismaInstance) {
    let url = process.env.DATABASE_URL;
    if (url && !url.includes('connection_limit')) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}connection_limit=5&pool_timeout=20`;
    }
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

/**
 * Safely verify whether PostgreSQL is accessible without crashing the process.
 * Returns true if connected, false if PostgreSQL service is offline or unreachable.
 */
export async function verifyDatabaseConnection() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('PostgreSQL connection timeout (10000ms)')), 10000);
      });

      const checkPromise = prisma.$queryRawUnsafe('SELECT 1 as connected')
        .then((res) => {
          clearTimeout(timeoutId);
          return res;
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          throw err;
        });

      // Prevent floating unhandled rejection if timeout triggers before Postgres probe completes
      checkPromise.catch(() => {});

      await Promise.race([checkPromise, timeoutPromise]);
      isDbConnected = true;
      console.log('[Database] 🐘 PostgreSQL connected successfully via Prisma ORM.');
      return true;
    } catch (err) {
      if (attempt < 5) {
        console.warn(`[Database] Probe attempt ${attempt} waiting for pooler... Retrying in 2s.`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        isDbConnected = false;
        console.warn(
          `[Database] ⚠️ PostgreSQL connection unavailable (${err.message ? err.message.split('\n')[0] : 'Timeout'}). Engaging dual-mode in-memory persistence fallback.`
        );
        return false;
      }
    }
  }
  return false;
}

export function isDatabaseConnected() {
  return isDbConnected;
}
