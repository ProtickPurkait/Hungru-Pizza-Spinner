'use client';

import { useRef, useState } from 'react';
import type { SiteSettings } from '@/lib/types';
import { compressImageFile } from '@/lib/clientImage';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type ColorField = 'primaryColor' | 'secondaryColor' | 'accentColor';

function ColorPicker({
  label,
  value,
  fallback,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_COLOR.test(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 rounded border p-0"
          aria-label={`${label} picker`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1"
          placeholder={fallback}
        />
      </div>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

export default function AdminSiteSettingsForm({ initialSettings }: { initialSettings: SiteSettings }) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function updateField<K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function handleLogoSelect(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const dataUrl = await compressImageFile(file, 300);
      updateField('logoUrl', dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not process that image.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });

    setSaving(false);

    if (res.ok) {
      setMessage('Saved! Changes are live on the spinner now.');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Save failed');
    }
  }

  const colorFields: { field: ColorField; label: string; fallback: string; hint?: string }[] = [
    { field: 'primaryColor', label: 'Primary color', fallback: '#B3121C', hint: 'Spin button, wheel rim & pointer.' },
    { field: 'secondaryColor', label: 'Secondary color', fallback: '#7A0D13', hint: 'Middle of the background gradient.' },
    { field: 'accentColor', label: 'Accent color', fallback: '#400000', hint: 'Gradient bottom & rim bulb dots.' },
  ];

  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow">
      <h2 className="text-lg font-bold">Site Branding</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Brand name</span>
          <input
            value={settings.brandName}
            onChange={(e) => updateField('brandName', e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>

        {colorFields.map(({ field, label, fallback, hint }) => (
          <ColorPicker
            key={field}
            label={label}
            value={settings[field]}
            fallback={fallback}
            hint={hint}
            onChange={(value) => updateField(field, value)}
          />
        ))}

        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Logo</span>
          <div className="flex items-center gap-2">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-gray-50 text-[10px] text-gray-400">
                none
              </span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              {uploading ? 'Processing…' : 'Upload logo'}
            </button>
            {settings.logoUrl && (
              <button
                type="button"
                onClick={() => updateField('logoUrl', '')}
                className="text-xs text-gray-500 underline"
              >
                Remove
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleLogoSelect(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <span className="text-xs text-gray-400">Any shape works — it's auto-cropped into a circle.</span>
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.suspenseMode}
          onChange={(e) => updateField('suspenseMode', e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-medium text-gray-700">Suspenseful spin</span>
          <span className="block text-xs text-gray-400">
            When on, the spin runs slower with a dramatic pause before landing. Turn off for a
            quick, simple spin instead.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
        {message && <span className="text-sm text-green-700">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
