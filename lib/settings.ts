import { getRedis } from './redis';
import type { SiteSettings } from './types';

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS: SiteSettings = {
  brandName: 'Hungru Pizza Barasat',
  primaryColor: '#B3121C',
  secondaryColor: '#7A0D13',
  accentColor: '#400000',
  logoUrl: '',
  suspenseMode: true,
};

export async function getSettings(): Promise<SiteSettings> {
  const redis = getRedis();
  if (!redis) return DEFAULT_SETTINGS;

  const raw = await redis.get<Partial<SiteSettings>>(SETTINGS_KEY);
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;

  return {
    brandName: raw.brandName || DEFAULT_SETTINGS.brandName,
    primaryColor: raw.primaryColor || DEFAULT_SETTINGS.primaryColor,
    secondaryColor: raw.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
    accentColor: raw.accentColor || DEFAULT_SETTINGS.accentColor,
    logoUrl: raw.logoUrl ?? DEFAULT_SETTINGS.logoUrl,
    suspenseMode:
      typeof raw.suspenseMode === 'boolean' ? raw.suspenseMode : DEFAULT_SETTINGS.suspenseMode,
  };
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(
      'Redis is not configured. Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.'
    );
  }
  await redis.set(SETTINGS_KEY, settings);
}
