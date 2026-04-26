'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Keyboard, QrCode, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StudentPhoto } from '@/components/ui/student-photo';
import { formatTime, parseStudentIdFromQr } from '@/lib/utils';

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
  mealPeriod?: 'morning' | 'lunch' | 'afternoon';
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'duplicate' | 'error';
const PERIOD_LABEL: Record<'morning' | 'lunch' | 'afternoon', string> = {
  morning: 'manhã',
  lunch: 'almoço',
  afternoon: 'tarde',
};

export default function CantinaPage() {
  const [presentCount, setPresentCount] = useState(0);
  const [todayMeals, setTodayMeals] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshSpinning, setRefreshSpinning] = useState(true);

  const [scannerActive, setScannerActive] = useState(false);
  const [manualName, setManualName] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<MealResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanFeedbackToken, setScanFeedbackToken] = useState(0);
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');
  const processingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const refreshSpinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSpinStartedAtRef = useRef(Date.now());

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

  useEffect(() => {
    if (loadingStats) {
      if (refreshSpinTimeoutRef.current) {
        clearTimeout(refreshSpinTimeoutRef.current);
        refreshSpinTimeoutRef.current = null;
      }
      refreshSpinStartedAtRef.current = Date.now();
      setRefreshSpinning(true);
      return;
    }

    const elapsed = Date.now() - refreshSpinStartedAtRef.current;
    const remaining = Math.max(0, 1000 - elapsed);

    if (remaining === 0) {
      setRefreshSpinning(false);
      return;
    }

    refreshSpinTimeoutRef.current = setTimeout(() => {
      setRefreshSpinning(false);
      refreshSpinTimeoutRef.current = null;
    }, remaining);

    return () => {
      if (refreshSpinTimeoutRef.current) {
        clearTimeout(refreshSpinTimeoutRef.current);
        refreshSpinTimeoutRef.current = null;
      }
    };
  }, [loadingStats]);

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
          setResult({
            success: false,
            alreadyServed: true,
            mealPeriod: data.mealPeriod,
            student: data.student,
            timestamp: new Date(),
          });
          fetchStats();
        } else if (!res.ok) {
          setStatus('error');
          setErrorMsg(data.error || 'Erro ao processar');
        } else {
          setStatus('success');
          setResult({
            success: true,
            mealPeriod: data.mealPeriod,
            student: data.student,
            timestamp: new Date(),
          });
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

  const handleScan = useCallback(
    (data: string) => {
      setScanFeedbackToken((prev) => prev + 1);
      const studentId = parseStudentIdFromQr(data);
      if (!studentId) {
        setStatus('error');
        setResult(null);
        setErrorMsg('QR Code inválido para aluno');
        return;
      }
      void processStudentInput(studentId, 'id');
    },
    [processStudentInput]
  );

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
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loadingStats}
          >
            <RefreshCw className={`h-4 w-4 ${refreshSpinning ? 'animate-spin' : ''}`} />
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
              <p className="mt-0.5 text-xs text-slate-500">Refeições hoje</p>
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
            onClick={() => { setInputMode('camera'); setScannerActive(false); }}
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
            <div className="bg-white p-0">
              <QrScanner
                onScan={handleScan}
                active={scannerActive}
                feedbackToken={scanFeedbackToken}
                onRequestStart={() => setScannerActive(true)}
              />
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
          <Card className="rounded-md border border-emerald-200 bg-emerald-50/60 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-3.5">
                <StudentPhoto
                  name={result.student.name}
                  photoData={result.student.photoData}
                  photoMime={result.student.photoMime}
                  size="xl"
                  lazy={false}
                  className="ring-2 ring-white shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    <span className="text-base font-semibold text-emerald-700">Refeição registrada</span>
                  </div>
                  <p className="truncate text-lg font-medium text-slate-900">{result.student.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'duplicate' && result && (
          <Card className="rounded-md border border-red-200 bg-red-50/60 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-3.5">
                <StudentPhoto
                  name={result.student.name}
                  photoData={result.student.photoData}
                  photoMime={result.student.photoMime}
                  size="xl"
                  lazy={false}
                  className="ring-2 ring-red-200 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-1.5">
                    <XCircle className="h-4.5 w-4.5 text-red-600" />
                    <span className="text-base font-semibold text-red-700">Refeição já registrada</span>
                  </div>
                  <p className="truncate text-lg font-medium text-slate-900">{result.student.name}</p>
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

        </div>
      </div>
    </ProtectedLayout>
  );
}
