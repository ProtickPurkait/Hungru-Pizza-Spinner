import { getSegments } from '@/lib/segments';
import AdminSegmentsForm from '@/components/AdminSegmentsForm';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const segments = await getSegments();

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Spinner Admin</h1>
        <p className="text-sm text-gray-600">
          Edit each prize&apos;s label, image URL, and win weight. Weights don&apos;t need to add up to
          100 — they&apos;re just relative odds.
        </p>
        <AdminSegmentsForm initialSegments={segments} />
      </div>
    </main>
  );
}
