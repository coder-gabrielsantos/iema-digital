'use client';

import { useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, LogIn, LogOut, Keyboard, QrCode } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const [scannerActive, setScannerActive] = useState(false);
  const [manualId, setManualId] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');
  const processingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const processId = useCallback(async (id: string) => {
    if (processingRef.current || !id.trim()) return;
    processingRef.current = true;

    setStatus('scanning');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id.trim() }),
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

  const handleScan = useCallback((data: string) => processId(data), [processId]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processId(manualId);
    setManualId('');
  };

  return (
    <ProtectedLayout requiredRole={['admin', 'portaria']}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Portaria</h1>
          <p className="mt-1 text-sm text-slate-500">
            Escaneie o QR Code do aluno para registrar entrada ou saída
          </p>
        </div>

        {/* Mode switcher */}
        <div className="mb-4 flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => { setInputMode('camera'); setScannerActive(true); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              inputMode === 'camera'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="h-4 w-4" />
            Câmera
          </button>
          <button
            onClick={() => { setInputMode('manual'); setScannerActive(false); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              inputMode === 'manual'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="h-4 w-4" />
            Manual
          </button>
        </div>

        {/* Camera scanner */}
        {inputMode === 'camera' && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Leitor de QR Code</CardTitle>
                <Button
                  variant={scannerActive ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => setScannerActive(!scannerActive)}
                >
                  {scannerActive ? 'Pausar' : 'Iniciar Câmera'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <QrScanner onScan={handleScan} active={scannerActive} />
            </CardContent>
          </Card>
        )}

        {/* Manual input */}
        {inputMode === 'manual' && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Entrada Manual de ID</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  placeholder="Cole o ObjectId do aluno..."
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="font-mono text-xs"
                  autoFocus
                />
                <Button type="submit" loading={status === 'scanning'} disabled={!manualId.trim()}>
                  Verificar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Result card */}
        {status === 'scanning' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent flex-shrink-0" />
              <p className="font-medium text-blue-900">Processando...</p>
            </CardContent>
          </Card>
        )}

        {status === 'success' && result && (
          <Card
            className={`border-2 ${
              result.type === 'entry'
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-amber-300 bg-amber-50'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <StudentPhoto
                    name={result.student.name}
                    photoData={result.student.photoData}
                    photoMime={result.student.photoMime}
                    size="xl"
                    className="ring-4 ring-white shadow-md"
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 rounded-full p-1.5 ${
                      result.type === 'entry' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  >
                    {result.type === 'entry' ? (
                      <LogIn className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2
                      className={`h-5 w-5 flex-shrink-0 ${
                        result.type === 'entry' ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    />
                    <span
                      className={`font-bold text-lg ${
                        result.type === 'entry' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {result.type === 'entry' ? 'Entrada Autorizada' : 'Saída Registrada'}
                    </span>
                  </div>
                  <p className="text-slate-900 font-semibold text-xl truncate">{result.student.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default">Turma {result.student.classCode}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 font-mono">
                    {result.student.studentId} · {formatTime(result.timestamp)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="border-2 border-red-200 bg-red-50">
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
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <QrCode className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">
              {inputMode === 'camera'
                ? 'Aponte a câmera para o QR Code do cartão do aluno'
                : 'Cole o ID do aluno para registrar entrada ou saída'}
            </p>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
