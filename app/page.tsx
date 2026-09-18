import { getSegments } from '@/lib/segments';
import Wheel from '@/components/Wheel';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const segments = await getSegments();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-700 via-red-800 to-red-950 px-4 py-10 text-white">
      <h1 className="mb-1 text-2xl font-extrabold tracking-wide">Hungru Pizza</h1>
      <p className="mb-8 text-sm opacity-90">Spin the wheel &amp; win a prize!</p>
      <Wheel initialSegments={segments} />
    </main>
  );
}
