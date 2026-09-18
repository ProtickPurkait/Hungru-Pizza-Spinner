'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Segment } from '@/lib/types';

export default function AdminSegmentsForm({ initialSegments }: { initialSegments: Segment[] }) {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateField(index: number, field: 'label' | 'imageUrl' | 'color' | 'weight', value: string) {
    setSegments((prev) =>
      prev.map((seg, i) =>
        i === index ? { ...seg, [field]: field === 'weight' ? Number(value) || 0 : value } : seg
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');

    const res = await fetch('/api/admin/segments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments }),
    });

    setSaving(false);

    if (res.ok) {
      setMessage('Saved! Changes are live on the spinner now.');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Save failed');
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  const totalWeight = segments.reduce((sum, s) => sum + (s.weight || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <a href="/api/admin/qr" className="rounded bg-gray-800 px-3 py-2 text-sm font-medium text-white">
          Download QR Code
        </a>
        <button onClick={handleLogout} className="rounded bg-gray-200 px-3 py-2 text-sm font-medium">
          Log out
        </button>
      </div>

      <div className="divide-y rounded-xl bg-white shadow">
        {segments.map((seg, i) => {
          const pct = totalWeight > 0 ? ((seg.weight / totalWeight) * 100).toFixed(1) : '0.0';
          return (
            <div key={seg.id} className="grid grid-cols-1 items-center gap-3 p-4 sm:grid-cols-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <input
                  value={seg.label}
                  onChange={(e) => updateField(i, 'label', e.target.value)}
                  className="w-full rounded border px-2 py-1"
                  aria-label={`Label for ${seg.id}`}
                />
              </div>
              <input
                value={seg.imageUrl}
                onChange={(e) => updateField(i, 'imageUrl', e.target.value)}
                placeholder="Image URL (optional)"
                className="w-full rounded border px-2 py-1"
                aria-label={`Image URL for ${seg.id}`}
              />
              <input
                value={seg.color}
                onChange={(e) => updateField(i, 'color', e.target.value)}
                className="w-full rounded border px-2 py-1"
                aria-label={`Color for ${seg.id}`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={seg.weight}
                  onChange={(e) => updateField(i, 'weight', e.target.value)}
                  className="w-24 rounded border px-2 py-1"
                  aria-label={`Weight for ${seg.id}`}
                />
                <span className="text-xs text-gray-500">{pct}% chance</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {message && <span className="text-sm text-green-700">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
