import { Redis } from '@upstash/redis';

let client: Redis | null = null;

/**
 * Returns null (instead of throwing) when Redis env vars aren't set, so the
 * app still runs locally / on first deploy using DEFAULT_SEGMENTS.
 * Supports both Upstash's own env var names and Vercel's KV integration names.
 */
export function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  if (!client) {
    client = new Redis({ url, token });
  }
  return client;
}
