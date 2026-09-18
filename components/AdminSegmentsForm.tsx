'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Segment } from '@/lib/types';

const MAX_DIMENSION = 400;
const MAX_DATA_URL_LENGTH = 350_000;
const JPEG_QUALITIES = [0.72, 0.5, 0.35];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load that image.'));
    img.src = src;
  });
}

async function compressImageFile(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression is not supported in this browser.');
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of JPEG_QUALITIES) {
    const result = canvas.toDataURL('image/jpeg', quality);
    if (result.length <= MAX_DATA_URL_LENGTH) return result;
  }

  throw new Error('That image is too large even after compression. Try a simpler photo.');
}

export default function AdminSegmentsForm({ initialSegments }: { initialSegments: Segment[] }) {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function updateField(index: number, field: 'label' | 'imageUrl' | 'color' | 'weight', value: string) {
    setSegments((prev) =>
      prev.map((seg, i) =>
        i === index ? { ...seg, [field]: field === 'weight' ? Number(value) || 0 : value } : seg
      )
    );
  }

  async function handleFileSelect(index: number, file: File | undefined) {
    if (!file) return;
    setUploadingIndex(index);
    setUploadErrors((prev) => ({ ...prev, [index]: '' }));

    try {
      const dataUrl = await compressImageFile(file);
      updateField(index, 'imageUrl', dataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not process that image.';
      setUploadErrors((prev) => ({ ...prev, [index]: msg }));
    } finally {
      setUploadingIndex(null);
    }
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
            <div key={seg.id} className="grid grid-cols-1 items-start gap-3 p-4 sm:grid-cols-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <input
                  value={seg.label}
                  onChange={(e) => updateField(i, 'label', e.target.value)}
                  className="w-full rounded border px-2 py-1"
                  aria-label={`Label for ${seg.id}`}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {seg.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={seg.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded border object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-gray-50 text-[10px] text-gray-400">
                      none
                    </span>
                  )}
                  <div className="flex flex-1 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[i]?.click()}
                      disabled={uploadingIndex === i}
                      className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                    >
                      {uploadingIndex === i ? 'Processing…' : 'Upload image'}
                    </button>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[i] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void handleFileSelect(i, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
                <input
                  value={seg.imageUrl}
                  onChange={(e) => updateField(i, 'imageUrl', e.target.value)}
                  placeholder="Or paste an image URL"
                  className="w-full rounded border px-2 py-1 text-xs"
                  aria-label={`Image URL for ${seg.id}`}
                />
                {uploadErrors[i] && <p className="text-xs text-red-600">{uploadErrors[i]}</p>}
              </div>

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
