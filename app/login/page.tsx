'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  portaria: 'Portaria',
  cantina: 'Cantina',
};

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('iema_role');
    if (role) {
      if (role === 'admin') router.replace('/dashboard');
      else if (role === 'portaria') router.replace('/portaria');
      else if (role === 'cantina') router.replace('/cantina');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Chave inválida');
        return;
      }

      localStorage.setItem('iema_role', data.role);
      localStorage.setItem('iema_key', data.key);

      if (data.role === 'admin') router.push('/dashboard');
      else if (data.role === 'portaria') router.push('/portaria');
      else if (data.role === 'cantina') router.push('/cantina');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-50 opacity-60 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">IEMA Digital</h1>
          <p className="mt-2 text-slate-500">Sistema de Gestão Escolar</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/60">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Acesso ao Sistema</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Insira sua chave de acesso para entrar
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Chave de Acesso
                </label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="Digite sua chave..."
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value);
                      setError('');
                    }}
                    className="h-12 pr-12 text-base font-mono tracking-widest"
                    autoComplete="off"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                size="lg"
                className="w-full"
              >
                {!loading && <ArrowRight className="h-5 w-5" />}
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>

            {/* Access key hints */}
            <div className="mt-6 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Chaves de demonstração</p>
              <div className="space-y-2">
                {[
                  { key: 'ADMIN-IEMA', label: 'Administrador', color: 'bg-blue-100 text-blue-700' },
                  { key: 'PORTARIA-IEMA', label: 'Portaria', color: 'bg-emerald-100 text-emerald-700' },
                  { key: 'CANTINA-IEMA', label: 'Cantina', color: 'bg-amber-100 text-amber-700' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setKey(item.key)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-slate-100 transition-colors group"
                  >
                    <span className="font-mono text-slate-600 group-hover:text-slate-900">{item.key}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${item.color}`}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} IEMA — Instituto de Ensino Médio e Profissional
        </p>
      </div>
    </div>
  );
}
