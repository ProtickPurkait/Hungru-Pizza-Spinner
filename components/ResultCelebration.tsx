'use client';

import { useMemo } from 'react';
import type { Segment } from '@/lib/types';

const CONFETTI_COLORS = ['#FFD966', '#7EC8E3', '#F4A9B0', '#A8D8A0', '#F5B87A', '#ffffff'];
const CONFETTI_COUNT = 34;

const MOTIVATIONAL_MESSAGES = [
  "So close! Give it another spin.",
  "Almost had it — try again!",
  "No prize this time, but you're close!",
  "Better luck next spin — you've got this!",
];

type ConfettiPieceStyle = React.CSSProperties & Record<`--confetti-${string}`, string>;

function buildConfettiPieces(seed: number): ConfettiPieceStyle[] {
  // Simple deterministic PRNG seeded by resultKey so re-renders during the
  // same result don't reshuffle mid-animation, but each new spin looks fresh.
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  return Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
    const angle = (rand() - 0.5) * 150;
    const distance = 50 + rand() * 110;
    const tx = Math.sin((angle * Math.PI) / 180) * distance;
    const rot = (rand() - 0.5) * 720;
    return {
      left: `${40 + rand() * 20}%`,
      backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      animationDuration: `${1100 + rand() * 500}ms`,
      animationDelay: `${rand() * 150}ms`,
      '--confetti-tx': `${tx}px`,
      '--confetti-rot': `${rot}deg`,
    };
  });
}

export default function ResultCelebration({
  result,
  resultKey,
}: {
  result: Segment | null;
  resultKey: number;
}) {
  const pieces = useMemo(() => buildConfettiPieces(resultKey || 1), [resultKey]);
  const message = useMemo(
    () => MOTIVATIONAL_MESSAGES[resultKey % MOTIVATIONAL_MESSAGES.length],
    [resultKey]
  );

  if (!result) return null;

  const isWin = result.id !== 'betterluck';

  if (isWin) {
    return (
      <div key={resultKey} className="relative w-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-visible">
          {pieces.map((style, i) => (
            <span
              key={i}
              className="animate-confetti-fall absolute top-0 h-2 w-2 rounded-sm"
              style={style}
            />
          ))}
        </div>
        <p className="animate-celebration-pop-in text-xl font-extrabold text-white drop-shadow">
          🎉 You won: {result.label}! 🎉
        </p>
      </div>
    );
  }

  return (
    <div key={resultKey} className="animate-celebration-pop-in flex flex-col items-center gap-1">
      <span className="animate-gentle-bounce text-3xl">💪</span>
      <p className="text-lg font-bold text-white">{message}</p>
    </div>
  );
}
