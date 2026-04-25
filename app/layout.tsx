import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IEMA Digital',
  description: 'Sistema de Gestão Escolar - IEMA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
