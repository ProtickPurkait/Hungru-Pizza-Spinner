import { pickWeightedIndex } from '../lib/weightedRandom';
import { DEFAULT_SEGMENTS } from '../lib/segments';

const RUNS = 10000;
const weights = DEFAULT_SEGMENTS.map((s) => s.weight);
const counts = new Array(DEFAULT_SEGMENTS.length).fill(0);

for (let i = 0; i < RUNS; i++) {
  counts[pickWeightedIndex(weights)]++;
}

const totalWeight = weights.reduce((a, b) => a + b, 0);

console.log(`Simulated ${RUNS} spins using the current DEFAULT_SEGMENTS weights:\n`);

DEFAULT_SEGMENTS.forEach((seg, i) => {
  const expectedPct = ((seg.weight / totalWeight) * 100).toFixed(1);
  const actualPct = ((counts[i] / RUNS) * 100).toFixed(1);
  console.log(
    `${seg.label.padEnd(28)} expected ~${expectedPct}%  actual ${actualPct}%  (${counts[i]} wins)`
  );
});
