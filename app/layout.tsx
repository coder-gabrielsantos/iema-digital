import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import { BrowserRejectionGuard } from '@/components/global/browser-rejection-guard';
import './globals.css';

const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans-main',
  display: 'swap',
});

const logoFont = Outfit({
  subsets: ['latin'],
  variable: '--font-logo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IEMA Digital',
  description: 'Sistema de Gestão Escolar - IEMA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sansFont.variable} ${logoFont.variable}`}>
      <body className={[sansFont.variable, logoFont.variable, 'min-h-screen font-sans antialiased'].join(' ')}>
        <BrowserRejectionGuard />
        {children}
      </body>
    </html>
  );
}
