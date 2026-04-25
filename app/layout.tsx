import type { Metadata } from 'next';
import { Noto_Sans, Outfit } from 'next/font/google';
import './globals.css';

const inter = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-inter',
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
    <html lang="pt-BR" className={`${inter.variable} ${logoFont.variable}`}>
      <body className={[inter.variable, logoFont.variable, 'min-h-screen font-sans antialiased'].join(' ')}>
        {children}
      </body>
    </html>
  );
}
