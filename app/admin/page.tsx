import { getSegments } from '@/lib/segments';
import { getSettings } from '@/lib/settings';
import AdminSegmentsForm from '@/components/AdminSegmentsForm';
import AdminSiteSettingsForm from '@/components/AdminSiteSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [segments, settings] = await Promise.all([getSegments(), getSettings()]);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Spinner Admin</h1>

        <AdminSiteSettingsForm initialSettings={settings} />

        <div>
          <h2 className="text-lg font-bold">Prizes</h2>
          <p className="text-sm text-gray-600">
            Edit each prize&apos;s label, image, and win weight. Weights don&apos;t need to add up to
            100 — they&apos;re just relative odds.
          </p>
        </div>
        <AdminSegmentsForm initialSegments={segments} />
      </div>
    </main>
  );
}
