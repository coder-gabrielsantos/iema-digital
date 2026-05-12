'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, X, XCircle, Keyboard, QrCode, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Select, { type StylesConfig } from 'react-select';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import {
  ManualStudentEntryForm,
  type ManualStudentOption,
} from '@/components/shared/manual-student-entry-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface MealEntry {
  _id: string;
  studentId: string;
  studentName: string;
  classCode: string;
  timestamp: string;
  date: string;
  mealPeriod: 'morning' | 'lunch' | 'afternoon';
}

interface MealStudentDetail {
  name: string;
  classCode: string;
  photoMime: string;
  photoData: string;
}

type ValidationStatus = 'pending' | 'success' | 'duplicate' | 'error';
interface FilterOption {
  value: string;
  label: string;
}

interface ValidationCard {
  id: string;
  status: ValidationStatus;
  student?: StudentInfo;
  errorMsg?: string;
}

const PERIOD_LABEL: Record<'morning' | 'lunch' | 'afternoon', string> = {
  morning: 'manhã',
  lunch: 'almoço',
  afternoon: 'tarde',
};
const VALIDATION_CARD_TTL_MS = 5000;

const FILTER_SELECT_STYLES: StylesConfig<FilterOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    height: 36,
    borderRadius: '0.375rem',
    borderColor: state.isFocused ? '#818cf8' : '#e2e8f0',
    boxShadow: 'none',
    '&:hover': { borderColor: '#818cf8' },
  }),
  valueContainer: (base) => ({
    ...base,
    height: 36,
    paddingInline: 8,
    paddingBlock: 0,
  }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: '#64748b', padding: 6 }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    borderRadius: '0.375rem',
    overflow: 'hidden',
  }),
};
export default function CantinaPage() {
  const [presentCount, setPresentCount] = useState(0);
  const [todayMeals, setTodayMeals] = useState(0);
  const [todayMealsList, setTodayMealsList] = useState<MealEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshSpinning, setRefreshSpinning] = useState(true);
  const [isMealsModalOpen, setIsMealsModalOpen] = useState(false);
  const [mealsClassFilter, setMealsClassFilter] = useState('');
  const [selectedMealStudent, setSelectedMealStudent] = useState<MealStudentDetail | null>(null);
  const [loadingMealStudent, setLoadingMealStudent] = useState(false);
  const [mealStudentError, setMealStudentError] = useState('');

  const [scannerActive, setScannerActive] = useState(false);
  const [manualStudentId, setManualStudentId] = useState('');
  const [selectedManualStudent, setSelectedManualStudent] = useState<ManualStudentOption | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationCards, setValidationCards] = useState<ValidationCard[]>([]);
  const [scanFeedbackToken, setScanFeedbackToken] = useState(0);
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');
  const processingRef = useRef(false);
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
      if (Array.isArray(meals)) {
        setTodayMeals(meals.length);
        setTodayMealsList(meals);
      } else {
        setTodayMeals(0);
        setTodayMealsList([]);
      }
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
      setIsProcessing(true);
      const validationId = `${mode}-${value.trim()}-${Date.now()}`;
      const pendingCard: ValidationCard = { id: validationId, status: 'pending' };
      setValidationCards((prev) => [pendingCard, ...prev].slice(0, 8));
      setTimeout(() => {
        setValidationCards((prev) => prev.filter((card) => card.id !== validationId));
      }, VALIDATION_CARD_TTL_MS);

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
          setValidationCards((prev) =>
            prev.map((card) =>
              card.id === validationId
                ? {
                    ...card,
                    status: 'duplicate',
                    student: data.student,
                  }
                : card
            )
          );
          fetchStats();
        } else if (!res.ok) {
          setValidationCards((prev) =>
            prev.map((card) =>
              card.id === validationId
                ? {
                    ...card,
                    status: 'error',
                    errorMsg: data.error || 'Erro ao processar',
                  }
                : card
            )
          );
        } else {
          setValidationCards((prev) =>
            prev.map((card) =>
              card.id === validationId
                ? {
                    ...card,
                    status: 'success',
                    student: data.student,
                  }
                : card
            )
          );
          fetchStats();
        }
      } catch {
        setValidationCards((prev) =>
          prev.map((card) =>
            card.id === validationId
              ? {
                  ...card,
                  status: 'error',
                  errorMsg: 'Erro de conexão',
                }
              : card
          )
        );
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [fetchStats]
  );

  const handleScan = useCallback(
    (data: string) => {
      setScanFeedbackToken((prev) => prev + 1);
      const studentId = parseStudentIdFromQr(data);
      if (!studentId) {
        const validationId = `qr-invalid-${Date.now()}`;
        const invalidQrCard: ValidationCard = {
          id: validationId,
          status: 'error',
          errorMsg: 'QR Code inválido para aluno',
        };
        setValidationCards((prev) =>
          [invalidQrCard, ...prev].slice(0, 8)
        );
        setTimeout(() => {
          setValidationCards((prev) => prev.filter((card) => card.id !== validationId));
        }, VALIDATION_CARD_TTL_MS);
        return;
      }
      void processStudentInput(studentId, 'id');
    },
    [processStudentInput]
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processStudentInput(manualStudentId, 'id');
    setManualStudentId('');
    setSelectedManualStudent(null);
  };

  const loadManualStudentOptions = useCallback(async (inputValue: string) => {
    const search = inputValue.trim();
    if (search.length < 2) return [];
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(search)}&page=1&pageSize=20`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data?.items)) return [];
      return data.items
        .map((student: { _id: string; name: string; classCode?: string }) => ({
          value: student._id,
          label: `${student.name} - Turma ${student.classCode || 'não informada'}`,
        }))
        .sort((a: ManualStudentOption, b: ManualStudentOption) =>
          a.label.localeCompare(b.label, 'pt-BR')
        );
    } catch {
      return [];
    }
  }, []);

  const mealClassOptions = [
    { value: '', label: 'Todas as turmas' },
    ...Array.from(new Set(todayMealsList.map((meal) => meal.classCode).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((classCode) => ({ value: classCode, label: classCode })),
  ];

  const filteredMeals = (mealsClassFilter
    ? todayMealsList.filter((meal) => meal.classCode === mealsClassFilter)
    : todayMealsList
  ).slice().sort((a, b) => a.studentName.localeCompare(b.studentName, 'pt-BR'));

  const openMealStudent = useCallback(async (meal: MealEntry) => {
    setLoadingMealStudent(true);
    setMealStudentError('');
    try {
      const res = await fetch(`/api/students/${meal.studentId}`);
      if (!res.ok) {
        throw new Error('Não foi possível carregar os dados do aluno');
      }
      const student: MealStudentDetail = await res.json();
      setSelectedMealStudent(student);
    } catch {
      setSelectedMealStudent({
        name: meal.studentName,
        classCode: meal.classCode,
        photoData: '',
        photoMime: '',
      });
      setMealStudentError('Não foi possível carregar a foto do aluno.');
    } finally {
      setLoadingMealStudent(false);
    }
  }, []);

  return (
    <ProtectedLayout requiredRole={['gestao', 'servidores']}>
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
            Atualizar contagem
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
          <Card className="overflow-hidden rounded-md shadow-none">
            <CardContent
              role="button"
              tabIndex={0}
              onClick={() => setIsMealsModalOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsMealsModalOpen(true);
                }
              }}
              className="cursor-pointer p-4 text-center transition-colors hover:bg-slate-50"
              aria-label="Abrir lista de refeições de hoje"
            >
              {loadingStats ? (
                <div className="mx-auto h-7 w-12 animate-pulse rounded bg-slate-200" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{todayMeals}</p>
              )}
              <p className="mt-0.5 text-xs text-slate-500">Refeições hoje</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-4 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
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
          <div className="mb-4 overflow-hidden rounded-md border border-slate-200/70 bg-white shadow-premium">
            <div className="bg-white p-0">
              <QrScanner
                onScan={handleScan}
                active={scannerActive}
                feedbackToken={scanFeedbackToken}
                onRequestStart={() => setScannerActive(true)}
                feedbackVariant="loading"
              />
            </div>
          </div>
        )}

        {inputMode === 'manual' && (
          <ManualStudentEntryForm
            inputId="cantina-manual-student"
            classNamePrefix="cantina-manual-student"
            loadOptions={loadManualStudentOptions}
            value={selectedManualStudent}
            onChange={(option) => {
              setSelectedManualStudent(option);
              setManualStudentId(option?.value || '');
            }}
            onSubmit={handleManualSubmit}
            submitDisabled={!manualStudentId.trim()}
            submitLoading={isProcessing}
            contextHint="registrar a refeição"
          />
        )}

        <div className="mt-2 flex flex-col gap-2">
          {validationCards.map((card) => {
            if (card.status === 'pending') {
              return (
                <Card key={card.id} className="rounded-md border-indigo-200 bg-indigo-50 shadow-none">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent flex-shrink-0" />
                    <p className="font-medium text-indigo-900">Validando...</p>
                  </CardContent>
                </Card>
              );
            }

            if (card.status === 'success' && card.student) {
              return (
                <Card key={card.id} className="rounded-md border border-emerald-200 bg-emerald-50/60 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <StudentPhoto
                        name={card.student.name}
                        photoData={card.student.photoData}
                        photoMime={card.student.photoMime}
                        size="xl"
                        lazy={false}
                        className="ring-2 ring-white shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                          <span className="text-base font-semibold text-emerald-700">Refeição registrada</span>
                        </div>
                        <p className="truncate text-lg font-medium text-slate-900">{card.student.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            if (card.status === 'duplicate' && card.student) {
              return (
                <Card key={card.id} className="rounded-md border border-red-200 bg-red-50/60 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <StudentPhoto
                        name={card.student.name}
                        photoData={card.student.photoData}
                        photoMime={card.student.photoMime}
                        size="xl"
                        lazy={false}
                        className="ring-2 ring-red-200 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center gap-1.5">
                          <XCircle className="h-4.5 w-4.5 text-red-600" />
                          <span className="text-base font-semibold text-red-700">Refeição já registrada</span>
                        </div>
                        <p className="truncate text-lg font-medium text-slate-900">{card.student.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={card.id} className="rounded-md border-2 border-red-200 bg-red-50 shadow-none">
                <CardContent className="p-6 flex items-center gap-4">
                  <XCircle className="h-10 w-10 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-700 text-lg">Erro</p>
                    <p className="text-sm text-red-600">{card.errorMsg || 'Erro ao processar'}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isMealsModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsMealsModalOpen(false)}
          >
            <div
              className="app-panel w-full max-w-xl rounded-md p-6 shadow-none"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Refeições registradas
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">Refeições de hoje</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMealsModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fechar modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 flex justify-end">
                <div className="w-full sm:w-52">
                  <Select
                    inputId="meals-class-filter"
                    aria-label="Filtro por turma"
                    isSearchable={false}
                    value={mealClassOptions.find((option) => option.value === mealsClassFilter)}
                    options={mealClassOptions}
                    onChange={(option) => setMealsClassFilter(option?.value ?? '')}
                    classNamePrefix="meals-class-filter"
                    styles={FILTER_SELECT_STYLES}
                  />
                </div>
              </div>

              <div className="max-h-[55vh] overflow-y-auto border border-slate-100">
                {filteredMeals.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">
                    Nenhuma refeição encontrada para o filtro selecionado.
                  </p>
                ) : (
                  filteredMeals.map((meal) => (
                    <button
                      type="button"
                      key={meal._id}
                      onClick={() => void openMealStudent(meal)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_4rem] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{meal.studentName}</p>
                        <p className="truncate text-xs text-slate-500">Turma {meal.classCode}</p>
                      </div>
                      <Badge variant="secondary" className="w-16 justify-center">
                        {formatTime(meal.timestamp)}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {(selectedMealStudent || loadingMealStudent) && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              if (loadingMealStudent) return;
              setSelectedMealStudent(null);
              setMealStudentError('');
            }}
          >
            <div
              className="app-panel w-full max-w-sm rounded-md p-6 text-center shadow-none"
              onClick={(event) => event.stopPropagation()}
            >
              {loadingMealStudent ? (
                <p className="text-sm text-slate-500">Carregando aluno...</p>
              ) : selectedMealStudent ? (
                <>
                  <StudentPhoto
                    name={selectedMealStudent.name}
                    photoData={selectedMealStudent.photoData}
                    photoMime={selectedMealStudent.photoMime}
                    size="xl"
                    lazy={false}
                    className="mx-auto mb-4 ring-2 ring-slate-100"
                  />
                  <p className="text-lg font-semibold text-slate-900">{selectedMealStudent.name}</p>
                  <p className="text-sm text-slate-500">Turma {selectedMealStudent.classCode}</p>
                  {mealStudentError ? (
                    <p className="mt-3 text-xs text-amber-600">{mealStudentError}</p>
                  ) : null}
                  <Button
                    variant="outline"
                    className="mt-5 w-full"
                    onClick={() => {
                      setSelectedMealStudent(null);
                      setMealStudentError('');
                    }}
                  >
                    Fechar
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        )}

        </div>
      </div>
    </ProtectedLayout>
  );
}
