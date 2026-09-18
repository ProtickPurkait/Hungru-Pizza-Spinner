import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSegments, saveSegments } from '@/lib/segments';

export const dynamic = 'force-dynamic';

const SegmentSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(60),
  imageUrl: z.string().max(500_000).optional().default(''),
  color: z.string().min(1),
  weight: z.number().min(0).max(1000),
});

const SegmentsSchema = z.array(SegmentSchema).length(6);

export async function GET() {
  const segments = await getSegments();
  return NextResponse.json({ segments });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SegmentsSchema.safeParse(body?.segments);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid segments payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await saveSegments(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save segments';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, segments: parsed.data });
}
