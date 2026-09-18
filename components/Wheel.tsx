'use client';

import { useEffect, useRef, useState } from 'react';
import type { Segment } from '@/lib/types';
import {
  primeSpinAudio,
  playSpinSound,
  playSingleTick,
  playLandingThunk,
  playWinSound,
  playLoseSound,
  type SpinSoundHandle,
} from '@/lib/spinSound';
import ResultCelebration from '@/components/ResultCelebration';

// Suspense mode (admin-toggleable): fast spin -> long decelerate that stops
// just short of the prize -> a held beat where it looks fully stopped ->
// one last slow creep into place, instead of one smooth slowdown.
const SUSPENSE_MAIN_EASE = 'cubic-bezier(0.1, 0.85, 0.05, 1)';
const SUSPENSE_MAIN_BEZIER: [number, number, number, number] = [0.1, 0.85, 0.05, 1];
const SUSPENSE_MAIN_DURATION_MS = 6000;
const CREEP_GAP_DEG = 10;
const SUSPENSE_HOLD_MS = 450;
const CREEP_DURATION_MS = 900;
const LANDING_PAUSE_MS = 500;

// Quick mode: one smooth spin straight to the prize, no held pauses.
const QUICK_EASE = 'cubic-bezier(0.12, 0.67, 0.1, 1)';
const QUICK_BEZIER: [number, number, number, number] = [0.12, 0.67, 0.1, 1];
const QUICK_DURATION_MS = 4500;

const FALLBACK_ICON: Record<string, string> = {
  fries: '🍟',
  coke: '🥤',
  sandwich: '🥪',
  betterluck: '😕',
  pizza: '🍕',
  chicken: '🍗',
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  // Rounded to avoid SSR/CSR hydration mismatches from tiny floating-point
  // differences in Math.cos/Math.sin between server and browser JS engines.
  return {
    x: Math.round((cx + r * Math.cos(rad)) * 1000) / 1000,
    y: Math.round((cy + r * Math.sin(rad)) * 1000) / 1000,
  };
}

function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function wrapLabel(label: string, maxCharsPerLine = 11): string[] {
  const words = label.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type WheelProps = {
  initialSegments: Segment[];
  primaryColor: string;
  accentColor: string;
  brandName: string;
  suspenseMode: boolean;
};

export default function Wheel({
  initialSegments,
  primaryColor,
  accentColor,
  brandName,
  suspenseMode,
}: WheelProps) {
  const [rotation, setRotation] = useState(0);
  const [transitionCss, setTransitionCss] = useState('none');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [errorMsg, setErrorMsg] = useState('');
  const rotationRef = useRef(0);
  const soundHandleRef = useRef<SpinSoundHandle | null>(null);

  const cx = 200;
  const cy = 200;
  const r = 188;
  const n = segments.length;
  const segAngle = 360 / n;

  useEffect(() => {
    return () => soundHandleRef.current?.cancel();
  }, []);

  async function handleSpin() {
    if (spinning) return;
    // Must run synchronously in the click handler (before any await) so the
    // browser treats the spin sound as user-initiated.
    primeSpinAudio();

    setSpinning(true);
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/spin', { method: 'POST' });
      if (!res.ok) throw new Error('Spin failed');
      const data = (await res.json()) as { winningIndex: number; segments: Segment[] };

      const freshSegments = data.segments;
      const winningIndex = data.winningIndex;
      setSegments(freshSegments);

      const count = freshSegments.length;
      const anglePer = 360 / count;
      const segmentCenter = winningIndex * anglePer + anglePer / 2;
      const targetAngle = (360 - segmentCenter) % 360;
      const jitter = (Math.random() - 0.5) * (anglePer * 0.5);
      const current = rotationRef.current;
      const normalizedCurrent = current % 360;
      const delta = ((targetAngle - normalizedCurrent) + 360) % 360;
      const extraSpins = 6;
      const finalRotation = current + delta + extraSpins * 360 + jitter;

      rotationRef.current = finalRotation;

      const reveal = () => {
        setSpinning(false);
        const winner = freshSegments[winningIndex];
        setResult(winner);
        setResultKey((k) => k + 1);
        if (winner.id === 'betterluck') {
          playLoseSound();
        } else {
          playWinSound();
        }
      };

      if (suspenseMode) {
        const nearStopRotation = finalRotation - CREEP_GAP_DEG;

        // Phase 1: fast spin decelerating to a near-stop, just short of the
        // actual prize — the pause here is the first suspense beat.
        setTransitionCss(`transform ${SUSPENSE_MAIN_DURATION_MS}ms ${SUSPENSE_MAIN_EASE}`);
        setRotation(nearStopRotation);

        soundHandleRef.current?.cancel();
        soundHandleRef.current = playSpinSound({
          durationMs: SUSPENSE_MAIN_DURATION_MS,
          totalRotationDeg: nearStopRotation - current,
          segmentAngleDeg: anglePer,
          bezier: SUSPENSE_MAIN_BEZIER,
        });

        window.setTimeout(() => {
          // Phase 2: held beat where the wheel looks fully stopped.
          window.setTimeout(() => {
            // Phase 3: one last slow creep the rest of the way to the prize.
            const crossesBoundary =
              Math.floor(nearStopRotation / anglePer) !== Math.floor(finalRotation / anglePer);
            if (crossesBoundary) {
              window.setTimeout(() => playSingleTick(), CREEP_DURATION_MS * 0.65);
            }

            setTransitionCss(`transform ${CREEP_DURATION_MS}ms ease-in-out`);
            setRotation(finalRotation);

            window.setTimeout(() => {
              // Phase 4: it has truly landed.
              playLandingThunk();
              // Phase 5: reveal, after one more held beat.
              window.setTimeout(reveal, LANDING_PAUSE_MS);
            }, CREEP_DURATION_MS);
          }, SUSPENSE_HOLD_MS);
        }, SUSPENSE_MAIN_DURATION_MS);
      } else {
        // Quick mode: one smooth spin straight to the prize, reveal immediately.
        setTransitionCss(`transform ${QUICK_DURATION_MS}ms ${QUICK_EASE}`);
        setRotation(finalRotation);

        soundHandleRef.current?.cancel();
        soundHandleRef.current = playSpinSound({
          durationMs: QUICK_DURATION_MS,
          totalRotationDeg: finalRotation - current,
          segmentAngleDeg: anglePer,
          bezier: QUICK_BEZIER,
        });

        window.setTimeout(reveal, QUICK_DURATION_MS + 100);
      }
    } catch {
      setSpinning(false);
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 'min(90vw, 420px)', aspectRatio: '1 / 1' }}>
        <div
          className="absolute left-1/2 z-30 -translate-x-1/2"
          style={{
            top: -14,
            width: 0,
            height: 0,
            borderLeft: '16px solid transparent',
            borderRight: '16px solid transparent',
            borderTop: `26px solid ${primaryColor}`,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))',
          }}
        />

        <svg viewBox="0 0 400 400" className="absolute inset-0 z-10 h-full w-full pointer-events-none">
          <circle cx="200" cy="200" r="196" fill="none" stroke={primaryColor} strokeWidth="18" />
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (360 / 24) * i;
            const p = polarToCartesian(200, 200, 196, angle);
            return <circle key={i} cx={p.x} cy={p.y} r="5" fill={accentColor} stroke={primaryColor} strokeWidth="1" />;
          })}
        </svg>

        <div
          className="absolute inset-0 z-20"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: transitionCss,
          }}
        >
          <svg viewBox="0 0 400 400" className="h-full w-full">
            {segments.map((seg, i) => {
              const start = i * segAngle;
              const end = start + segAngle;
              const mid = start + segAngle / 2;
              const labelPos = polarToCartesian(cx, cy, r * 0.84, mid);
              const iconPos = polarToCartesian(cx, cy, r * 0.5, mid);
              const iconSize = 82;
              const lines = wrapLabel(seg.label);

              return (
                <g key={seg.id}>
                  <path d={wedgePath(cx, cy, r, start, end)} fill={seg.color} stroke="#ffffff" strokeWidth="2" />

                  {seg.imageUrl ? (
                    <image
                      href={seg.imageUrl}
                      x={iconPos.x - iconSize / 2}
                      y={iconPos.y - iconSize / 2}
                      width={iconSize}
                      height={iconSize}
                      transform={`rotate(${mid}, ${iconPos.x}, ${iconPos.y})`}
                    />
                  ) : (
                    <text
                      x={iconPos.x}
                      y={iconPos.y}
                      fontSize="46"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid}, ${iconPos.x}, ${iconPos.y})`}
                    >
                      {FALLBACK_ICON[seg.id] ?? '🎁'}
                    </text>
                  )}

                  <text
                    fontSize="13"
                    fontWeight="700"
                    fill="#1a1a1a"
                    textAnchor="middle"
                    transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    {lines.map((line, li) => (
                      <tspan key={li} x={labelPos.x} y={labelPos.y} dy={(li - (lines.length - 1) / 2) * 14}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <button
          onClick={handleSpin}
          disabled={spinning}
          aria-label="Spin the wheel"
          className="absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-white text-white shadow-lg disabled:opacity-90"
          style={{ width: '23%', height: '23%', backgroundColor: primaryColor }}
        >
          <span className="text-base font-extrabold leading-none tracking-wide">
            {spinning ? '…' : 'SPIN'}
          </span>
          <span className="mt-1 max-w-[85%] truncate text-center text-[8px] font-semibold leading-none opacity-90">
            {brandName}
          </span>
        </button>
      </div>

      <div className="relative mt-6 flex min-h-[90px] w-full flex-col items-center text-center">
        <ResultCelebration result={!spinning ? result : null} resultKey={resultKey} />
        {errorMsg && <p className="text-sm text-red-200">{errorMsg}</p>}
      </div>
    </div>
  );
}
