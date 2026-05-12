'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import AuthSplitShell from '@/components/auth-split-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { readStoredRole } from '@/lib/stored-role';

function fieldClass(dark?: boolean) {
  return cn(
    'h-11 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
    dark
      ? 'border-slate-600/80 bg-slate-900/50 text-white shadow-none placeholder:text-slate-500 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/25'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20'
  );
}

function LoginForm({
  keyValue,
  setKeyValue,
  showKey,
  setShowKey,
  loading,
  error,
  onSubmit,
  dark,
}: {
  keyValue: string;
  setKeyValue: (value: string) => void;
  showKey: boolean;
  setShowKey: (value: boolean) => void;
  loading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  dark?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5 text-center">
        <h1 className={cn('text-xl font-semibold tracking-tight', dark ? 'text-white' : 'text-slate-900')}>
          Acesso a Plataforma
        </h1>
        <p className={cn('text-sm leading-relaxed', dark ? 'text-slate-400' : 'text-slate-500')}>
          Entre com sua chave de acesso para continuar
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <div>
          <div className="relative">
            <Lock
              className={cn(
                'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
                dark ? 'text-slate-500' : 'text-slate-400'
              )}
              aria-hidden
            />
            <Input
              id={dark ? 'access-key-mobile' : 'access-key'}
              type={showKey ? 'text' : 'password'}
              required
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className={cn(fieldClass(dark), 'pl-10 pr-12')}
              placeholder="Chave de Acesso"
              autoComplete="off"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                dark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-400 hover:text-slate-600'
              )}
              aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
            >
              {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error ? (
          <div
            className={cn(
              'rounded-md border p-3 text-left text-sm',
              dark ? 'border-rose-500/30 bg-rose-950/40 text-rose-300' : 'border-rose-200/80 bg-rose-50/80 text-rose-800'
            )}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="leading-relaxed">{error}</div>
            </div>
          </div>
        ) : null}

        <Button
          type="submit"
          loading={loading}
          className={cn(
            'h-11 w-full rounded-md text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]',
            dark ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]' : ''
          )}
        >
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          {loading ? 'Verificando...' : 'Entrar'}
        </Button>
      </form>

    </>
  );
}

export default function LoginPage() {
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const role = readStoredRole();
    if (role === 'gestao' || role === 'servidores') router.replace('/alunos');
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Chave inválida');
        return;
      }

      localStorage.setItem('iema_role', data.role);
      localStorage.setItem('iema_key', data.key);

      if (data.role === 'gestao' || data.role === 'servidores') router.push('/alunos');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitShell
      mobileSlot={
        <LoginForm
          keyValue={keyValue}
          setKeyValue={setKeyValue}
          showKey={showKey}
          setShowKey={setShowKey}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          dark
        />
      }
      desktopSlot={
        <>
          <LoginForm
            keyValue={keyValue}
            setKeyValue={setKeyValue}
            showKey={showKey}
            setShowKey={setShowKey}
            loading={loading}
            error={error}
            onSubmit={handleSubmit}
          />
          <p className="mt-5 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} IEMA - Instituto de Ensino Médio e Profissional
          </p>
        </>
      }
    />
  );
}
