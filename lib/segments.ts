import { getRedis } from './redis';
import type { Segment } from './types';

const SEGMENTS_KEY = 'segments';

/**
 * Default wheel content, matching the client's reference design. Weights are
 * just a sane starting point — fully editable from /admin, no redeploy needed.
 */
export const DEFAULT_SEGMENTS: Segment[] = [
  { id: 'fries', label: 'French Fries (Small)', imageUrl: '', color: '#FFD966', weight: 15 },
  { id: 'coke', label: 'Masala Coke', imageUrl: '', color: '#7EC8E3', weight: 15 },
  { id: 'sandwich', label: 'Chk / Veg Sandwich Grill', imageUrl: '', color: '#F4A9B0', weight: 10 },
  { id: 'betterluck', label: 'Better Luck Next Time', imageUrl: '', color: '#C9B6E4', weight: 35 },
  { id: 'pizza', label: '8" Pizza of Your Choice', imageUrl: '', color: '#A8D8A0', weight: 10 },
  { id: 'chicken', label: 'Chk Strips / Cheese Ball', imageUrl: '', color: '#F5B87A', weight: 15 },
];

export async function getSegments(): Promise<Segment[]> {
  const redis = getRedis();
  if (!redis) return DEFAULT_SEGMENTS;

  const raw = await redis.get<Segment[]>(SEGMENTS_KEY);
  if (!raw || !Array.isArray(raw) || raw.length !== 6) return DEFAULT_SEGMENTS;
  return raw;
}

export async function saveSegments(segments: Segment[]): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(
      'Redis is not configured. Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.'
    );
  }
  await redis.set(SEGMENTS_KEY, segments);
}
