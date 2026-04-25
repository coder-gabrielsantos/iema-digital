'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, UtensilsCrossed, Keyboard, QrCode, RefreshCw, Pause, Play } from 'lucide-react';
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
}

interface MealResult {
  success: boolean;
  alreadyServed?: boolean;
  student: StudentInfo;
  timestamp: Date;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'duplicate' | 'error';

export default function CantinaPage() {
  const [presentCount, setPresentCount] = useState(0);
  const [todayMeals, setTodayMeals] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const [scannerActive, setScannerActive] = useState(false);
  const [manualName, setManualName] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<MealResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');
  const processingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [dashRes, mealsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/meals'),
      ]);
      const [dash, meals] = await Promise.all([dashRes.json(), mealsRes.json()]);
      setPresentCount(dash.presentStudents || 0);
      setTodayMeals(Array.isArray(meals) ? meals.length : 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchStats();
    }, 0);
    const interval = setInterval(fetchStats, 30000);
    return () => {
      window.clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchStats]);

  const processStudentInput = useCallback(
    async (value: string, mode: 'id' | 'name') => {
      if (processingRef.current || !value.trim()) return;
      processingRef.current = true;

      setStatus('scanning');
      setResult(null);
      setErrorMsg('');

      try {
        const res = await fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'name'
              ? { studentName: value.trim() }
              : { studentId: value.trim() }
          ),
        });

        const data = await res.json();

        if (res.status === 409 && data.alreadyServed) {
          setStatus('duplicate');
          setResult({ success: false, alreadyServed: true, student: data.student, timestamp: new Date() });
          fetchStats();
        } else if (!res.ok) {
          setStatus('error');
          setErrorMsg(data.error || 'Erro ao processar');
        } else {
          setStatus('success');
          setResult({ success: true, student: data.student, timestamp: new Date() });
          fetchStats();
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
    },
    [fetchStats]
  );

  const handleScan = useCallback((data: string) => processStudentInput(data, 'id'), [processStudentInput]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processStudentInput(manualName, 'name');
    setManualName('');
  };

  return (
    <ProtectedLayout requiredRole={['admin', 'cantina']}>
      <div className="min-h-[calc(100vh-4rem)] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Cantina</h1>
            <p className="mt-1 text-sm text-slate-500">
              Valide o QR para registrar refeição
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} loading={loadingStats}>
            <RefreshCw className="h-4 w-4" />
            Atualizar Contagem
          </Button>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <Card className="rounded-md shadow-none">
            <CardContent className="p-4 text-center">
              {loadingStats ? (
                <div className="mx-auto h-7 w-12 animate-pulse rounded bg-slate-200" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{presentCount}</p>
              )}
              <p className="mt-0.5 text-xs text-slate-500">Alunos no instituto</p>
            </CardContent>
          </Card>
          <Card className="rounded-md shadow-none">
            <CardContent className="p-4 text-center">
              {loadingStats ? (
                <div className="mx-auto h-7 w-12 animate-pulse rounded bg-slate-200" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{todayMeals}</p>
              )}
              <p className="mt-0.5 text-xs text-slate-500">Refeições Hoje</p>
            </CardContent>
          </Card>
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
            <CardContent className="bg-white px-4 pb-4 pt-3">
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
              <p className="font-medium text-indigo-900">Validando...</p>
            </CardContent>
          </Card>
        )}

        {status === 'success' && result && (
          <Card className="rounded-md border-2 border-emerald-300 bg-emerald-50 shadow-none">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <StudentPhoto
                  name={result.student.name}
                  photoData={result.student.photoData}
                  photoMime={result.student.photoMime}
                  size="xl"
                  lazy={false}
                  className="ring-4 ring-white shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold text-lg text-emerald-700">Refeição Registrada</span>
                  </div>
                  <p className="text-slate-900 font-semibold text-xl truncate">{result.student.name}</p>
                  <Badge variant="success" className="mt-2">Turma {result.student.classCode}</Badge>
                  <p className="mt-2 text-xs text-slate-500">{formatTime(result.timestamp)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'duplicate' && result && (
          <Card className="rounded-md border-2 border-red-300 bg-red-50 shadow-none">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <StudentPhoto
                  name={result.student.name}
                  photoData={result.student.photoData}
                  photoMime={result.student.photoMime}
                  size="xl"
                  lazy={false}
                  className="ring-4 ring-red-200 shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-bold text-lg text-red-700">Refeição já Registrada!</span>
                  </div>
                  <p className="text-slate-900 font-semibold text-xl truncate">{result.student.name}</p>
                  <Badge variant="destructive" className="mt-2">Turma {result.student.classCode}</Badge>
                  <p className="mt-2 text-sm text-red-600">Este aluno já recebeu sua refeição hoje.</p>
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
                <p className="font-bold text-red-700 text-lg">Erro</p>
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'idle' && (
          <Card className="mt-2 rounded-md shadow-none">
            <CardContent className="p-6 text-center">
            <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-300 mb-2" />
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
