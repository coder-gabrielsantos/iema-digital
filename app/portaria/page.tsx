'use client';

import { useState, useCallback, useRef } from 'react';
import { XCircle, LogIn, LogOut, Keyboard, QrCode, Pause, Play } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentPhoto } from '@/components/ui/student-photo';
import { formatTime } from '@/lib/utils';

const QrScanner = dynamic(
  () => import('@/components/portaria/qr-scanner').then((m) => m.QrScanner),
  { ssr: false }
);

interface StudentInfo {
  studentId: string;
  name: string;
  classCode: string;
  photoMime: string;
  photoData: string;
  isPresent: boolean;
}

interface ScanResult {
  type: 'entry' | 'exit';
  student: StudentInfo;
  timestamp: Date;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export default function PortariaPage() {
  const [scannerActive, setScannerActive] = useState(true);
  const [manualName, setManualName] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');
  const processingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const processStudentInput = useCallback(async (value: string, mode: 'id' | 'name') => {
    if (processingRef.current || !value.trim()) return;
    processingRef.current = true;

    setStatus('scanning');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'name'
            ? { studentName: value.trim() }
            : { studentId: value.trim() }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Erro ao processar');
      } else {
        setStatus('success');
        setResult({ type: data.type, student: data.student, timestamp: new Date() });
      }
    } catch {
      setStatus('error');
      setErrorMsg('Erro de conexão');
    } finally {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setStatus('idle');
        setResult(null);
        setErrorMsg('');
        processingRef.current = false;
      }, 5000);
    }
  }, []);

  const handleScan = useCallback((data: string) => processStudentInput(data, 'id'), [processStudentInput]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processStudentInput(manualName, 'name');
    setManualName('');
  };

  return (
    <ProtectedLayout requiredRole={['admin', 'portaria']}>
      <div className="min-h-[calc(100vh-4rem)] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Portaria</h1>
          <p className="mt-1 text-sm text-slate-500">
            Escaneie o QR para registrar acesso
          </p>
        </div>

        <div className="relative mb-4 rounded-full border border-slate-200 bg-slate-100 p-1">
          <div
            className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
              inputMode === 'manual' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          <div className="relative z-10 flex">
          <button
            onClick={() => { setInputMode('camera'); setScannerActive(true); }}
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
            onClick={() => { setInputMode('manual'); setScannerActive(false); }}
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

        {inputMode === 'camera' && (
          <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-premium">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <p className="text-xs font-medium tracking-wide text-slate-400">
                Posicione o QR Code no centro da câmera
              </p>
              <button
                onClick={() => setScannerActive(!scannerActive)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  scannerActive
                    ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    : 'border-indigo-500 bg-indigo-500 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-600'
                }`}
              >
                {scannerActive ? (
                  <><Pause className="h-3 w-3" /> Pausar</>
                ) : (
                  <><Play className="h-3 w-3" /> Iniciar</>
                )}
              </button>
            </div>
            <div className="bg-white px-4 pb-4 pt-3">
              <QrScanner onScan={handleScan} active={scannerActive} />
            </div>
          </div>
        )}

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
                  loading={status === 'scanning'}
                  disabled={!manualName.trim()}
                  className="h-10 rounded-full border-0 bg-indigo-500 px-4 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-600"
                >
                  Verificar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {status === 'scanning' && (
          <Card className="rounded-md border-indigo-200 bg-indigo-50 shadow-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent flex-shrink-0" />
              <p className="font-medium text-indigo-900">Processando...</p>
            </CardContent>
          </Card>
        )}

        {status === 'success' && result && (
          <Card
            className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ${
              result.type === 'entry'
                ? 'ring-1 ring-emerald-500/15'
                : 'ring-1 ring-amber-500/15'
            }`}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="flex gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <StudentPhoto
                    name={result.student.name}
                    photoData={result.student.photoData}
                    photoMime={result.student.photoMime}
                    size="xl"
                    lazy={false}
                    className="ring-1 ring-slate-100"
                  />
                  <div
                    className={`absolute bottom-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm ${
                      result.type === 'entry' ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                  >
                    {result.type === 'entry' ? (
                      <LogIn className="h-3 w-3 text-white" strokeWidth={2.25} />
                    ) : (
                      <LogOut className="h-3 w-3 text-white" strokeWidth={2.25} />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        result.type === 'entry' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      aria-hidden
                    />
                    <p className="text-sm text-slate-500">
                      {result.type === 'entry' ? 'Entrada autorizada' : 'Saída registrada'}
                    </p>
                  </div>
                  <p className="truncate text-2xl font-normal tracking-tight text-slate-900 sm:text-[1.65rem] sm:leading-snug">
                    {result.student.name}
                  </p>
                  <p className="mt-3 font-mono text-[11px] leading-relaxed text-slate-400 sm:text-xs">
                    <span className="break-all">{result.student.studentId}</span>
                    <span className="mx-1.5 text-slate-300" aria-hidden>
                      ·
                    </span>
                    <span className="whitespace-nowrap text-slate-500 tabular-nums">
                      {formatTime(result.timestamp)}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="rounded-md border-2 border-red-200 bg-red-50 shadow-none">
            <CardContent className="p-6 flex items-center gap-4">
              <XCircle className="h-10 w-10 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-700 text-lg">Acesso Negado</p>
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'idle' && (
          <Card className="mt-2 rounded-md shadow-none">
            <CardContent className="p-6 text-center">
            <QrCode className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">
              {inputMode === 'camera'
                ? 'Aponte para o QR do aluno'
                : 'Digite o nome do aluno'}
            </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
