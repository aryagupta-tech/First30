import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { LocaleProvider } from '@/components/LocaleProvider';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
  const localHost = host.startsWith('localhost') || host.startsWith('127.') || host.startsWith('[::1]');
  const protocol = requestHeaders.get('x-forwarded-proto') || (localHost ? 'http' : 'https');
  const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`);
  return {
    metadataBase,
    title: 'FIRST30 — The first 30 minutes matter',
    description: 'Turn scattered fraud evidence into one complete, verifiable response file.',
    openGraph: { title: 'FIRST30', description: 'Explain the fraud once. Use the file everywhere.', images: ['/og.png'] },
    twitter: { card: 'summary_large_image', title: 'FIRST30', description: 'Explain the fraud once. Use the file everywhere.', images: ['/og.png'] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  );
}
