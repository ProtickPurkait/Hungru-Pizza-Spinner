'use client';

import { useRef, useState } from 'react';
import type { SiteSettings } from '@/lib/types';
import { compressImageFile } from '@/lib/clientImage';

export default function AdminSiteSettingsForm({ initialSettings }: { initialSettings: SiteSettings }) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function updateField(field: keyof SiteSettings, value: string) {
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

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Primary color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(settings.primaryColor) ? settings.primaryColor : '#B3121C'}
              onChange={(e) => updateField('primaryColor', e.target.value)}
              className="h-9 w-9 shrink-0 rounded border p-0"
              aria-label="Primary color picker"
            />
            <input
              value={settings.primaryColor}
              onChange={(e) => updateField('primaryColor', e.target.value)}
              className="w-full rounded border px-2 py-1"
              placeholder="#B3121C"
            />
          </div>
          <span className="text-xs text-gray-400">Tip: pick a darker shade so white text stays readable.</span>
        </label>

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
