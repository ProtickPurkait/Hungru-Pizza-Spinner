import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const hexColor = (label: string) =>
  z.string().regex(/^#[0-9a-fA-F]{6}$/, `${label} must be a hex value like #B3121C`);

const SettingsSchema = z.object({
  brandName: z.string().min(1).max(60),
  primaryColor: hexColor('Primary color'),
  secondaryColor: hexColor('Secondary color'),
  accentColor: hexColor('Accent color'),
  logoUrl: z.string().max(500_000).optional().default(''),
});

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(body?.settings);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid settings payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await saveSettings(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: parsed.data });
}
