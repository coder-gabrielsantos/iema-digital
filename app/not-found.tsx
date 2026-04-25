import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
        <ShieldCheck className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-6xl font-black text-slate-200 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Página não encontrada</h2>
      <p className="text-slate-500 mb-8 max-w-sm">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
