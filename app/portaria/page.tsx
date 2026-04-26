'use client';

import { useState, useCallback, useRef } from 'react';
import { XCircle, LogIn, LogOut, Keyboard, QrCode, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTime, parseStudentIdFromQr } from '@/lib/utils';

const QrScanner = dynamic(
  () => import('@/components/portaria/qr-scanner').then((m) => m.QrScanner),
  { ssr: false }
);

interface ScanToast {
  id: string;
  studentId: string;
  name: string;
  classCode: string;
  type: 'entry' | 'exit';
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

const DEBOUNCE_MS = 3000;
const TOAST_TTL_MS = 4000;

export default function PortariaPage() {
  const [scannerActive, setScannerActive] = useState(false);
  const [manualName, setManualName] = useState('');
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');
  const [toasts, setToasts] = useState<ScanToast[]>([]);
  const [scanFeedbackToken, setScanFeedbackToken] = useState(0);

  // per-QR debounce: studentId → timestamp of last scan
  const lastScanTimes = useRef<Map<string, number>>(new Map());
  // manual submit lock (only for manual, camera is always free)
  const manualProcessing = useRef(false);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleRemoval = useCallback(
    (id: string) => {
      setTimeout(() => removeToast(id), TOAST_TTL_MS);
    },
    [removeToast]
  );

  const processStudentInput = useCallback(
    async (value: string, mode: 'id' | 'name') => {
      const key = value.trim();
      if (!key) return;
      const showToast = true;

      // Per-QR debounce
      const now = Date.now();
      const last = lastScanTimes.current.get(key) ?? 0;
      if (now - last < DEBOUNCE_MS) return;
      lastScanTimes.current.set(key, now);

      const toastId = `${key}-${now}`;
      if (showToast) {
        const pending: ScanToast = {
          id: toastId,
          studentId: key,
          name: '...',
          classCode: '',
          type: 'entry',
          timestamp: new Date(),
          status: 'pending',
        };
        setToasts((prev) => [pending, ...prev].slice(0, 8));
        scheduleRemoval(toastId);
      }

      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'name' ? { studentName: key } : { studentId: key }
          ),
        });
        const data = await res.json();

        if (showToast) {
          setToasts((prev) =>
            prev.map((t) =>
              t.id !== toastId
                ? t
                : res.ok && !data.blockedByTimeWindow
                ? {
                    ...t,
                    status: 'success',
                    name: data.student.name,
                    classCode: data.student.classCode,
                    type: data.type,
                  }
                : {
                    ...t,
                    status: 'error',
                    name: '—',
                    error:
                      data.error ||
                      (data.blockedByTimeWindow
                        ? 'Aguarde 5 minutos para alterar o status novamente'
                        : 'Erro'),
                  }
            )
          );
        }
      } catch {
        if (showToast) {
          setToasts((prev) =>
            prev.map((t) =>
              t.id === toastId
                ? { ...t, status: 'error', name: '—', error: 'Erro de conexão' }
                : t
            )
          );
        }
      }
    },
    [scheduleRemoval]
  );

  const handleScan = useCallback(
    (data: string) => {
      setScanFeedbackToken((prev) => prev + 1);
      const studentId = parseStudentIdFromQr(data);
      if (!studentId) {
        const now = Date.now();
        const toastId = `scan-error-${now}`;
        const errorToast: ScanToast = {
          id: toastId,
          studentId: '',
          name: '—',
          classCode: '',
          type: 'entry',
          timestamp: new Date(now),
          status: 'error',
          error: 'QR Code inválido para aluno',
        };
        setToasts((prev) => [
          errorToast,
          ...prev,
        ].slice(0, 8));
        scheduleRemoval(toastId);
        return;
      }
      void processStudentInput(studentId, 'id');
    },
    [processStudentInput, scheduleRemoval]
  );

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualProcessing.current) return;
    manualProcessing.current = true;
    const name = manualName.trim();
    setManualName('');
    await processStudentInput(name, 'name');
    manualProcessing.current = false;
  };

  return (
    <ProtectedLayout requiredRole={['admin', 'portaria']}>
      <div className="min-h-[calc(100vh-4rem)] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Portaria</h1>
            <p className="mt-1 text-sm text-slate-500">Escaneie o QR para registrar acesso</p>
          </div>

          {/* Mode toggle */}
          <div className="relative mb-4 rounded-full border border-slate-200 bg-slate-100 p-1">
            <div
              className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
                inputMode === 'manual' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <div className="relative z-10 flex">
              <button
                onClick={() => {
                  setInputMode('camera');
                  setScannerActive(false);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                  inputMode === 'camera'
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <QrCode className="h-4 w-4" />
                Câmera
              </button>
              <button
                onClick={() => {
                  setInputMode('manual');
                  setScannerActive(false);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                  inputMode === 'manual'
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Keyboard className="h-4 w-4" />
                Manual
              </button>
            </div>
          </div>

          {/* Camera */}
          <div
            className={`mb-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-premium ${
              inputMode === 'camera' ? 'block' : 'hidden'
            }`}
          >
            <div className="bg-white p-0">
              <QrScanner
                onScan={handleScan}
                active={scannerActive}
                feedbackToken={scanFeedbackToken}
                onRequestStart={() => setScannerActive(true)}
              />
            </div>
          </div>

          {/* Manual */}
          {inputMode === 'manual' && (
            <Card className="mb-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-premium">
              <CardHeader className="border-b border-slate-100 px-5 py-3.5">
                <CardTitle className="text-xs font-medium tracking-wide text-slate-400">
                  Registro manual
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white px-4 py-4">
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <Input
                    placeholder="Nome do aluno"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="h-10 rounded-full border-slate-200 text-sm"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={!manualName.trim()}
                    className="h-10 rounded-full border-0 bg-indigo-500 px-4 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-600"
                  >
                    Verificar
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="mt-2 flex flex-col gap-2">
            {toasts.map((toast) => (
              <ScanToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
            ))}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

function ScanToastCard({
  toast,
  onDismiss,
}: {
  toast: ScanToast;
  onDismiss: (id: string) => void;
}) {
  if (toast.status === 'pending') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400 shrink-0" />
        <p className="text-sm text-slate-500">Processando...</p>
      </div>
    );
  }

  if (toast.status === 'error') {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 shadow-sm cursor-pointer"
        onClick={() => onDismiss(toast.id)}
      >
        <XCircle className="h-5 w-5 text-red-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-700">{toast.error}</p>
        </div>
        <p className="text-xs text-red-400 tabular-nums shrink-0">{formatTime(toast.timestamp)}</p>
      </div>
    );
  }

  const isEntry = toast.type === 'entry';

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm cursor-pointer transition-opacity ${
        isEntry
          ? 'border-emerald-100 bg-emerald-50'
          : 'border-amber-100 bg-amber-50'
      }`}
      onClick={() => onDismiss(toast.id)}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isEntry ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      >
        {isEntry ? (
          <LogIn className="h-4 w-4 text-white" strokeWidth={2.25} />
        ) : (
          <LogOut className="h-4 w-4 text-white" strokeWidth={2.25} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-slate-900">{toast.name}</p>
        <p className={`text-xs ${isEntry ? 'text-emerald-700' : 'text-amber-700'}`}>
          {isEntry ? 'Entrada' : 'Saída'} · {toast.classCode}
        </p>
      </div>
      <p className="text-xs text-slate-400 tabular-nums shrink-0">{formatTime(toast.timestamp)}</p>
    </div>
  );
}
