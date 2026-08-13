import { Redis } from 'ioredis';
import { valkeyUrl } from './bullmq.service.js';

let connection: Redis | null = null;

function client(): Redis {
  const url = valkeyUrl();
  if (!url) throw new Error('VALKEY_URL is not configured');
  connection ??= new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
  return connection;
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ count: number; remaining: number; resetAt: number }> {
  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `tgim:rate:${bucket}:${key}`;
  const redis = client();
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.pexpire(redisKey, windowMs + 1_000);
  return {
    count,
    remaining: Math.max(0, limit - count),
    resetAt: (bucket + 1) * windowMs,
  };
}

export async function closeRateLimiter(): Promise<void> {
  if (connection) await connection.quit();
  connection = null;
}
