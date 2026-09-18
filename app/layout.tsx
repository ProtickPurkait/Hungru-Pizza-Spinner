import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hungru Pizza Barasat — Spin & Win',
  description: 'Scan, spin, and win a prize at Hungru Pizza Barasat!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
