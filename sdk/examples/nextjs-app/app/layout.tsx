import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TraceInject Next.js Example',
  description: 'Example Next.js app with remote debugging via TraceInject',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
