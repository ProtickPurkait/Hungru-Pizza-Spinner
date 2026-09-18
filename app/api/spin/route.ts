import { NextResponse } from 'next/server';
import { getSegments } from '@/lib/segments';
import { pickWeightedIndex } from '@/lib/weightedRandom';

export const dynamic = 'force-dynamic';

export async function POST() {
  const segments = await getSegments();
  const winningIndex = pickWeightedIndex(segments.map((s) => s.weight));
  return NextResponse.json({ winningIndex, segments });
}
