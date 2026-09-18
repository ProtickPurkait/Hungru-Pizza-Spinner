import { getSegments } from '@/lib/segments';
import { getSettings } from '@/lib/settings';
import Wheel from '@/components/Wheel';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [segments, settings] = await Promise.all([getSegments(), getSettings()]);

  const background = `linear-gradient(to bottom, ${settings.primaryColor}, ${settings.secondaryColor}, ${settings.accentColor})`;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-white"
      style={{ background }}
    >
      {settings.logoUrl && (
        <div className="mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-white/80 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.logoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <h1 className="mb-1 text-center text-2xl font-extrabold tracking-wide">{settings.brandName}</h1>
      <p className="mb-8 text-sm opacity-90">Spin the wheel &amp; win a prize!</p>
      <Wheel
        initialSegments={segments}
        primaryColor={settings.primaryColor}
        accentColor={settings.accentColor}
        brandName={settings.brandName}
        logoUrl={settings.logoUrl}
        suspenseMode={settings.suspenseMode}
      />
    </main>
  );
}
