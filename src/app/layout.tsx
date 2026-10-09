import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Comy | Norway Company Intelligence Agent',
  description:
    'Comy researches Norwegian companies using organization numbers, permitted public sources, evidence verification, and freshness tracking.',
  keywords: [
    'Comy',
    'Norway company intelligence',
    'Norwegian companies',
    'Organization number',
    'Brønnøysundregistrene',
    'Enhetsregisteret',
    'Regnskapsregisteret',
  ],
  openGraph: {
    title: 'Comy – Norway Company Intelligence Agent',
    description: 'Autonomous evidence-backed research for Norwegian companies.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
