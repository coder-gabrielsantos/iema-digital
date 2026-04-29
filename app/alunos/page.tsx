'use client';

import { useEffect, useState, useCallback, useMemo, useRef, type FormEvent } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Select from 'react-select';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StudentPhoto } from '@/components/ui/student-photo';
import { formatTime } from '@/lib/utils';

interface Student {
  _id: string;
  name: string;
  classCode: string;
  photoMime: string;
  photoData?: string;
  isPresent: boolean;
  earlyExitTime?: string;
  absenceJustification?: string;
}

interface StudentDetail extends Student {
  photoData: string;
}

interface DashboardData {
  totalStudents: number;
  presentStudents: number;
  earlyExitStudents: number;
  presentPercent: number;
  date: string;
  isToday: boolean;
}

type Filter = 'all' | 'present' | 'absent' | 'early-exit';
const PAGE_SIZE = 12;
const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'present', label: 'Presentes' },
  { value: 'absent', label: 'Ausentes' },
  { value: 'early-exit', label: 'Saídas antecipadas' },
];

const FILTER_SELECT_STYLES = {
  control: (base: object, state: { isFocused?: boolean }) => ({
    ...base,
    minHeight: 44,
    height: 44,
    borderRadius: 6,
    borderColor: state.isFocused ? '#818cf8' : '#e2e8f0',
    boxShadow: 'none',
    '&:hover': { borderColor: '#818cf8' },
  }),
  valueContainer: (base: object) => ({
    ...base,
    height: 44,
    paddingInline: 10,
    paddingBlock: 0,
  }),
  indicatorsContainer: (base: object) => ({ ...base, height: 44 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: object) => ({ ...base, color: '#64748b' }),
  menu: (base: object) => ({ ...base, zIndex: 20 }),
};

/** ~5 opções visíveis; 190px cortava a 5ª linha (opções ~40–44px). */
const CLASS_SELECT_MENU_MAX_HEIGHT = 248;

function getInputDateString(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export default function AlunosPage() {
  const todayInputValue = getInputDateString();
  const [students, setStudents] = useState<Student[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [classFilter, setClassFilter] = useState('');
  const [classCodes, setClassCodes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [qrStudent, setQrStudent] = useState<StudentDetail | null>(null);
  const [qrContextStudent, setQrContextStudent] = useState<Student | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [justificationStudent, setJustificationStudent] = useState<Student | null>(null);
  const [absenceJustification, setAbsenceJustification] = useState('');
  const [isEditingJustification, setIsEditingJustification] = useState(false);
  const [savingJustification, setSavingJustification] = useState(false);
  const [deletingJustification, setDeletingJustification] = useState(false);
  const [justificationError, setJustificationError] = useState('');

  const normalizedSearch = search.trim().toLowerCase();
  const visibleStudents = useMemo(() => {
    if (!normalizedSearch) return students;

    return students.filter((student) =>
      student.name.toLowerCase().includes(normalizedSearch)
    );
  }, [students, normalizedSearch]);

  const classFilterOptions = useMemo(
    () => [
      { value: '', label: 'Todas as turmas' },
      ...classCodes.map((code) => ({ value: code, label: code })),
    ],
    [classCodes]
  );

  const fetchStudents = useCallback(async (activePage = page) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (classFilter) params.set('classCode', classFilter);
      params.set('status', filter);
      params.set('page', String(activePage));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('date', selectedDate);

      const res = await fetch(`/api/students?${params}`);
      if (!res.ok) {
        throw new Error(`Falha ao carregar alunos (HTTP ${res.status})`);
      }

      const data: {
        items: Student[];
        classCodes?: string[];
        pagination: { page: number; totalPages: number; total: number };
      } = await res.json();

      setStudents(data.items);
      if (Array.isArray(data.classCodes)) {
        setClassCodes(data.classCodes);
      }
      setTotalPages(data.pagination.totalPages || 1);
      setPage(data.pagination.page || 1);
    } catch (e) {
      console.error(e);
      setStudents([]);
      setError('Não foi possível carregar os alunos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [search, filter, classFilter, page, selectedDate]);

  const fetchDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate });
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) return;
      const data: DashboardData = await res.json();
      setDashboard(data);
    } catch (e) {
      console.error(e);
    }
  }, [selectedDate]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStudents(page), fetchDashboard()]);
  }, [fetchStudents, fetchDashboard, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([fetchStudents(page), fetchDashboard()]);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents, fetchDashboard, page]);

  useEffect(() => {
    if (!isCalendarOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!calendarContainerRef.current) return;
      if (calendarContainerRef.current.contains(event.target as Node)) return;
      setIsCalendarOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  async function openQr(student: Student) {
    setQrContextStudent(student);
    setLoadingQr(true);
    try {
      const res = await fetch(`/api/students/${student._id}`);
      const detail: StudentDetail = await res.json();
      setQrStudent(detail);
    } catch {
      setQrStudent({ ...student, photoData: '' });
    } finally {
      setLoadingQr(false);
    }
  }

  function closeQrModal() {
    setQrStudent(null);
    setQrContextStudent(null);
  }

  function openJustificationModal(student: Student) {
    setJustificationStudent(student);
    setAbsenceJustification(student.absenceJustification || '');
    setIsEditingJustification(!student.absenceJustification);
    setJustificationError('');
  }

  function closeJustificationModal() {
    if (savingJustification) return;
    setJustificationStudent(null);
    setAbsenceJustification('');
    setIsEditingJustification(false);
    setJustificationError('');
  }

  async function saveAbsenceJustification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!justificationStudent || !isEditingJustification) return;

    const nativeSubmitEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeSubmitEvent.submitter as HTMLButtonElement | null;
    if (submitter?.dataset.action !== 'save-justification') return;

    const justification = absenceJustification.trim();
    if (!justification) {
      setJustificationError('Informe a justificativa da ausência.');
      return;
    }

    setSavingJustification(true);
    setJustificationError('');

    try {
      const res = await fetch('/api/absence-justifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: justificationStudent._id,
          studentName: justificationStudent.name,
          classCode: justificationStudent.classCode,
          date: selectedDate,
          justification,
        }),
      });
      const data: { justification?: string; error?: string } = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar justificativa.');
      }

      setStudents((current) =>
        current.map((student) =>
          student._id === justificationStudent._id
            ? { ...student, absenceJustification: data.justification || justification }
            : student
        )
      );
      setJustificationStudent(null);
      setAbsenceJustification('');
      setIsEditingJustification(false);
    } catch (e) {
      setJustificationError(
        e instanceof Error ? e.message : 'Não foi possível salvar a justificativa.'
      );
    } finally {
      setSavingJustification(false);
    }
  }

  async function deleteAbsenceJustification() {
    if (!justificationStudent) return;

    setDeletingJustification(true);
    setJustificationError('');

    try {
      const res = await fetch('/api/absence-justifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: justificationStudent._id,
          date: selectedDate,
        }),
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao apagar justificativa.');
      }

      setStudents((current) =>
        current.map((student) =>
          student._id === justificationStudent._id
            ? { ...student, absenceJustification: '' }
            : student
        )
      );
      setQrContextStudent((current) =>
        current && current._id === justificationStudent._id
          ? { ...current, absenceJustification: '' }
          : current
      );
      setAbsenceJustification('');
      setIsEditingJustification(false);
    } catch (e) {
      setJustificationError(
        e instanceof Error ? e.message : 'Não foi possível apagar a justificativa.'
      );
    } finally {
      setDeletingJustification(false);
    }
  }

  const presentCount = dashboard?.presentStudents ?? 0;
  const totalStudents = dashboard?.totalStudents ?? 0;
  const absentCount = totalStudents - presentCount;
  const earlyExitCount = dashboard?.earlyExitStudents ?? 0;
  const attendanceRate = dashboard?.presentPercent ?? 0;
  const isSelectedDateToday = selectedDate === todayInputValue;
  const selectedDateObj = parseDateString(selectedDate);
  const selectedDateLabel = selectedDateObj.toLocaleDateString('pt-BR');
  const todayDateObj = parseDateString(todayInputValue);

  return (
    <ProtectedLayout requiredRole="admin">
      <div className="min-h-[calc(100vh-4rem)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Painel de Alunos</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isSelectedDateToday
                ? 'Lista unificada com presença em tempo real para acompanhamento da administração'
                : 'Histórico de frequência salvo para a data selecionada'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div ref={calendarContainerRef} className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCalendarOpen((open) => !open)}
                className="h-11 w-full justify-between px-3 sm:w-56"
                aria-label="Selecionar data da frequência"
                aria-expanded={isCalendarOpen}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <span>{selectedDateLabel}</span>
                </span>
              </Button>
              {isCalendarOpen ? (
                <div className="absolute right-0 z-30 mt-3 w-[20rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.55)] backdrop-blur">
                  <DayPicker
                    mode="single"
                    locale={ptBR}
                    weekStartsOn={0}
                    selected={selectedDateObj}
                    onSelect={(day) => {
                      if (!day) return;
                      setSelectedDate(getInputDateString(day));
                      setPage(1);
                      setIsCalendarOpen(false);
                    }}
                    disabled={{ after: todayDateObj }}
                    className="w-full"
                    classNames={{
                      root: 'w-full text-slate-900',
                      month: 'space-y-3',
                      month_caption: 'mb-1 flex h-10 items-center justify-center rounded-xl bg-slate-50 text-sm font-bold capitalize text-slate-900',
                      caption_label: 'tracking-tight',
                      nav: 'absolute left-4 right-4 top-4 flex items-center justify-between',
                      button_previous: 'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-40',
                      button_next: 'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-40',
                      month_grid: 'w-full border-separate border-spacing-y-1',
                      weekdays: 'grid grid-cols-7 px-1',
                      weekday: 'pb-1 text-center text-[0.7rem] font-bold uppercase tracking-wide text-slate-400',
                      week: 'grid grid-cols-7',
                      day: 'text-center',
                      day_button: 'mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25',
                      selected: '[&>button]:bg-indigo-600 [&>button]:text-white [&>button]:shadow-[0_10px_22px_-10px_rgba(79,70,229,0.95)] [&>button]:hover:bg-indigo-600 [&>button]:hover:text-white',
                      today: '[&>button]:font-bold [&>button]:text-indigo-700 [&>button]:ring-1 [&>button]:ring-indigo-200',
                      disabled: '[&>button]:cursor-not-allowed [&>button]:text-slate-300 [&>button]:hover:bg-transparent [&>button]:hover:text-slate-300',
                    }}
                    components={{
                      Chevron: ({ orientation, ...props }) => (
                        orientation === 'left'
                          ? <ChevronLeft className="h-4 w-4" {...props} />
                          : <ChevronRight className="h-4 w-4" {...props} />
                      ),
                    }}
                  />
                </div>
              ) : null}
            </div>
            {!isSelectedDateToday ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(todayInputValue);
                  setPage(1);
                  setIsCalendarOpen(false);
                }}
              >
                Hoje
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <Card className="rounded-md shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Presentes</p>
            </CardContent>
          </Card>
          <Card className="rounded-md shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-rose-500">{Math.max(absentCount, 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ausentes</p>
            </CardContent>
          </Card>
          <Card className="rounded-md shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{earlyExitCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Saídas antecipadas</p>
            </CardContent>
          </Card>
          <Card className="rounded-md shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">{attendanceRate}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Taxa de presença</p>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Card className="rounded-md shadow-none">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tabela de Alunos
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <div className="w-full sm:w-64">
                  <Select
                    inputId="students-status-filter"
                    aria-label="Filtro de status"
                    isSearchable={false}
                    value={FILTER_OPTIONS.find((option) => option.value === filter)}
                    options={FILTER_OPTIONS}
                    onChange={(option) => {
                      if (!option) return;
                      setFilter(option.value);
                      setPage(1);
                    }}
                    classNamePrefix="students-filter"
                    styles={FILTER_SELECT_STYLES}
                  />
                </div>
                <div className="w-full sm:w-64">
                  <Select
                    inputId="students-class-filter"
                    aria-label="Filtro por turma"
                    isSearchable={classCodes.length > 8}
                    placeholder="Turma..."
                    maxMenuHeight={CLASS_SELECT_MENU_MAX_HEIGHT}
                    value={classFilterOptions.find((o) => o.value === classFilter) ?? classFilterOptions[0]}
                    options={classFilterOptions}
                    onChange={(option) => {
                      if (!option) return;
                      setClassFilter(option.value);
                      setPage(1);
                    }}
                    classNamePrefix="students-class-filter"
                    styles={FILTER_SELECT_STYLES}
                    noOptionsMessage={() => 'Nenhuma turma'}
                  />
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 w-full rounded-md pl-9"
                  />
                </div>
              </div>
            </div>
            {loading ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0">
                    <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <p className="font-medium">Nenhum aluno encontrado</p>
                <p className="text-sm mt-1">Ajuste os filtros ou tente outra busca</p>
              </div>
            ) : (
              <div>
                <div className="hidden md:grid grid-cols-[1fr_auto] gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <span>Aluno</span>
                  <span>Status / Ação</span>
                </div>
                {visibleStudents.map((student) => (
                  <div
                    key={student._id}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 border-b border-slate-100 bg-white px-4 py-3 last:border-b-0 hover:bg-slate-50 sm:px-6 sm:py-4 md:grid-cols-[1fr_auto] md:gap-4"
                  >
                    <button
                      type="button"
                      disabled={loadingQr}
                      aria-label={`Ver QR Code de ${student.name}`}
                      onClick={() => void openQr(student)}
                      className="flex min-w-0 items-center gap-3 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      <StudentPhoto
                        name={student.name}
                        photoData={student.photoData}
                        photoMime={student.photoMime}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base text-slate-900 sm:text-lg">
                          {student.name}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400 sm:text-xs max-w-[12.5rem] sm:max-w-xs">
                          {student._id}
                        </p>
                      </div>
                    </button>
                    <div className="justify-self-start md:justify-self-end">
                      {student.earlyExitTime ? (
                        <Badge variant="warning" className="w-fit">
                          Saída antecipada às {formatTime(student.earlyExitTime)}
                        </Badge>
                      ) : student.isPresent ? (
                        <Badge variant="success" className="w-fit">
                          {isSelectedDateToday ? 'Presente' : 'Com frequência'}
                        </Badge>
                      ) : student.absenceJustification ? (
                        <Badge variant="outline" className="w-fit">
                          Ausência justificada
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="w-fit">
                          {isSelectedDateToday ? 'Ausente' : 'Sem frequência'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Exibindo página {page} de {totalPages}
          </p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="flex-1 sm:flex-none"
            >
              Anterior
            </Button>
            <Button
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
              className="flex-1 sm:flex-none"
            >
              Próxima
            </Button>
          </div>
        </div>

        {justificationStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closeJustificationModal}
          >
            <form
              className="app-panel w-full max-w-lg rounded-md p-6 shadow-none"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(event) => void saveAbsenceJustification(event)}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Justificativa de ausência
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {justificationStudent.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Turma {justificationStudent.classCode} • {selectedDateLabel}
                </p>
                </div>
                {absenceJustification ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => void deleteAbsenceJustification()}
                    disabled={savingJustification || deletingJustification}
                    aria-label="Apagar justificativa"
                    title="Apagar justificativa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>

              <label
                htmlFor="absence-justification"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Justificativa
              </label>
              {isEditingJustification ? (
                <textarea
                  id="absence-justification"
                  value={absenceJustification}
                  onChange={(event) => {
                    setAbsenceJustification(event.target.value);
                    if (justificationError) setJustificationError('');
                  }}
                  maxLength={1000}
                  rows={5}
                  placeholder="Digite o motivo da ausência..."
                  className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] placeholder:text-slate-400 transition-colors focus-visible:border-indigo-400/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/18 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={savingJustification}
                  autoFocus
                />
              ) : (
                <div className="min-h-24 whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {absenceJustification || 'Sem justificativa cadastrada.'}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {absenceJustification.length}/1000 caracteres
                </p>
                {justificationError ? (
                  <p className="text-right text-xs font-medium text-rose-600">
                    {justificationError}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeJustificationModal}
                  disabled={savingJustification}
                >
                  Cancelar
                </Button>
                {isEditingJustification ? (
                  <Button
                    type="submit"
                    loading={savingJustification}
                    data-action="save-justification"
                  >
                    Salvar justificativa
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsEditingJustification(true);
                    }}
                  >
                    Editar justificativa
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {qrStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closeQrModal}
          >
            <div
              className="app-panel w-full max-w-xs rounded-md p-6 text-center shadow-none sm:max-w-md sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <StudentPhoto
                name={qrStudent.name}
                photoData={qrStudent.photoData}
                photoMime={qrStudent.photoMime}
                size="xl"
                lazy={false}
                className="mx-auto mb-4 ring-4 ring-slate-100"
              />
              <h3 className="font-bold text-slate-900 text-lg mb-0.5">{qrStudent.name}</h3>
              <p className="text-sm text-slate-500 mb-1">Turma {qrStudent.classCode}</p>
              <p className="text-xs text-slate-400 font-mono mb-6 break-all">{qrStudent._id}</p>
              <div className="mb-6 flex justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
                <QRCodeSVG value={qrStudent._id} size={180} level="H" marginSize={1} />
              </div>
              <p className="text-xs text-slate-400 mb-4">
                QR Code contém o ID único do aluno no banco de dados
              </p>
              {qrContextStudent && !qrContextStudent.isPresent && !qrContextStudent.earlyExitTime ? (
                <Button
                  variant="outline"
                  className="mb-3 w-full"
                  onClick={() => {
                    openJustificationModal(qrContextStudent);
                    closeQrModal();
                  }}
                >
                  {qrContextStudent.absenceJustification
                    ? 'Ver justificativa'
                    : 'Justificar ausência'}
                </Button>
              ) : null}
              <Button variant="outline" className="w-full" onClick={closeQrModal}>
                Fechar
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
