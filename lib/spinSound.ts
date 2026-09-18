'use client';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext })
    .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctor();
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Must be called synchronously inside the click handler (before any
 * `await`) so the browser's autoplay policy treats audio as user-initiated.
 */
export function primeSpinAudio(): void {
  getAudioContext();
}

function playTick(ctx: AudioContext, freq = 720, peakGain = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(peakGain, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.065);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

/** A single tick, for moments outside the main scheduled sequence (e.g. the final creep). */
export function playSingleTick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    playTick(ctx, 820, 0.18);
  } catch {
    // Ignore — audio is a nice-to-have.
  }
}

/** The soft "thunk" the wheel makes the moment it fully stops. */
export function playLandingThunk(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    // Ignore — audio is a nice-to-have.
  }
}

type Point = [number, number];

function buildBezierLUT(x1: number, y1: number, x2: number, y2: number, samples = 200): Point[] {
  const table: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3;
    const y = 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3;
    table.push([x, y]);
  }
  return table;
}

/** Given the eased output progress (0-1), finds the elapsed-time fraction (0-1) it happens at. */
function timeFractionForProgress(table: Point[], targetY: number): number {
  for (let i = 1; i < table.length; i++) {
    const [, y0] = table[i - 1];
    const [, y1] = table[i];
    if (targetY >= y0 && targetY <= y1) {
      const [x0] = table[i - 1];
      const [x1v] = table[i];
      const t = (targetY - y0) / (y1 - y0 || 1);
      return x0 + (x1v - x0) * t;
    }
  }
  return 1;
}

export type SpinSoundHandle = { cancel: () => void };

/**
 * Schedules tick sounds at the exact moments the wheel crosses each segment
 * boundary, computed from the same cubic-bezier easing the CSS transition
 * uses — so the ticks naturally speed up at the start and spread out as the
 * wheel decelerates, matching what's on screen.
 */
export function playSpinSound(params: {
  durationMs: number;
  totalRotationDeg: number;
  segmentAngleDeg: number;
  bezier?: [number, number, number, number];
}): SpinSoundHandle {
  const ctx = getAudioContext();
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  if (!ctx || params.totalRotationDeg <= 0 || params.segmentAngleDeg <= 0) {
    return { cancel: () => {} };
  }

  const [x1, y1, x2, y2] = params.bezier ?? [0.12, 0.67, 0.1, 1];
  const table = buildBezierLUT(x1, y1, x2, y2);

  const crossings = Math.floor(params.totalRotationDeg / params.segmentAngleDeg);
  for (let k = 1; k <= crossings; k++) {
    const targetY = (k * params.segmentAngleDeg) / params.totalRotationDeg;
    if (targetY > 1) break;
    const timeFraction = timeFractionForProgress(table, targetY);
    const delayMs = timeFraction * params.durationMs;
    // Ticks rise in pitch and volume as the wheel nears the end — the last,
    // slowest ticks land the most prominently, building suspense.
    const progress = k / crossings;
    const freq = 640 + progress * 260;
    const peakGain = 0.11 + progress * 0.12;
    timeouts.push(
      setTimeout(() => {
        try {
          playTick(ctx, freq, peakGain);
        } catch {
          // Ignore — audio is a nice-to-have, never block the spin over it.
        }
      }, delayMs)
    );
  }

  return { cancel: () => timeouts.forEach(clearTimeout) };
}

function playNote(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  { type, peakGain, duration }: { type: OscillatorType; peakGain: number; duration: number }
) {
  const start = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Short cheerful ascending arpeggio, played the moment a real prize is shown. */
export function playWinSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      playNote(ctx, freq, i * 0.09, { type: 'triangle', peakGain: 0.22, duration: 0.28 });
    });
  } catch {
    // Ignore — audio is a nice-to-have, never block the result over it.
  }
}

/** Soft, gentle two-note dip — a neutral "try again" tone, not a harsh fail buzzer. */
export function playLoseSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [440, 349.23]; // A4 down to F4
    notes.forEach((freq, i) => {
      playNote(ctx, freq, i * 0.14, { type: 'sine', peakGain: 0.14, duration: 0.32 });
    });
  } catch {
    // Ignore — audio is a nice-to-have, never block the result over it.
  }
}
