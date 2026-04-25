'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Select from 'react-select';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StudentPhoto } from '@/components/ui/student-photo';

interface Student {
  _id: string;
  name: string;
  classCode: string;
  photoMime: string;
  photoData?: string;
  isPresent: boolean;
}

interface StudentDetail extends Student {
  photoData: string;
}

interface DashboardData {
  totalStudents: number;
  presentStudents: number;
  presentPercent: number;
}

type Filter = 'all' | 'present' | 'absent';
const PAGE_SIZE = 12;
const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'present', label: 'Presentes' },
  { value: 'absent', label: 'Ausentes' },
];

export default function AlunosPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredCount, setFilteredCount] = useState(0);
  const [qrStudent, setQrStudent] = useState<StudentDetail | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleStudents = useMemo(() => {
    if (!normalizedSearch) return students;

    return students.filter((student) => (
      student.name.toLowerCase().includes(normalizedSearch) ||
      student.classCode.toLowerCase().includes(normalizedSearch) ||
      student._id.toLowerCase().includes(normalizedSearch)
    ));
  }, [students, normalizedSearch]);

  const fetchStudents = useCallback(async (activePage = page) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('status', filter);
      params.set('page', String(activePage));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/students?${params}`);
      if (!res.ok) {
        throw new Error(`Falha ao carregar alunos (HTTP ${res.status})`);
      }

      const data: {
        items: Student[];
        pagination: { page: number; totalPages: number; total: number };
      } = await res.json();

      setStudents(data.items);
      setTotalPages(data.pagination.totalPages || 1);
      setPage(data.pagination.page || 1);
      setFilteredCount(data.pagination.total || 0);
    } catch (e) {
      console.error(e);
      setStudents([]);
      setFilteredCount(0);
      setError('Não foi possível carregar os alunos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) return;
      const data: DashboardData = await res.json();
      setDashboard(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStudents(page), fetchDashboard()]);
  }, [fetchStudents, fetchDashboard, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([fetchStudents(page), fetchDashboard()]);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents, fetchDashboard, page]);

  async function openQr(student: Student) {
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

  const presentCount = dashboard?.presentStudents ?? 0;
  const totalStudents = dashboard?.totalStudents ?? 0;
  const absentCount = totalStudents - presentCount;
  const attendanceRate = dashboard?.presentPercent ?? 0;

  return (
    <ProtectedLayout requiredRole="admin">
      <div className="min-h-[calc(100vh-4rem)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Painel de Alunos</h1>
            <p className="mt-1 text-sm text-slate-500">
              Lista unificada com presença em tempo real para acompanhamento da administração
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshAll} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <Card className="rounded-md shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total</p>
            </CardContent>
          </Card>
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
              <p className="text-2xl font-bold text-violet-600">{attendanceRate}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Taxa de Presença</p>
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
                <div className="w-full sm:w-48">
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
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        minHeight: 44,
                        height: 44,
                        borderRadius: 6,
                        borderColor: state.isFocused ? '#818cf8' : '#e2e8f0',
                        boxShadow: 'none',
                        '&:hover': { borderColor: '#818cf8' },
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        height: 44,
                        paddingInline: 10,
                        paddingBlock: 0,
                      }),
                      indicatorsContainer: (base) => ({ ...base, height: 44 }),
                      indicatorSeparator: () => ({ display: 'none' }),
                      dropdownIndicator: (base) => ({ ...base, color: '#64748b' }),
                      menu: (base) => ({ ...base, zIndex: 20 }),
                    }}
                  />
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome ou turma..."
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
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <span>Aluno</span>
                  <span>Turma</span>
                  <span>Status</span>
                  <span>QR Code</span>
                </div>
                {visibleStudents.map((student) => (
                  <div
                    key={student._id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors sm:px-6 sm:py-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center md:gap-4"
                  >
                    <div className="col-span-2 flex items-center gap-3 min-w-0 md:col-span-1">
                      <StudentPhoto
                        name={student.name}
                        photoData={student.photoData}
                        photoMime={student.photoMime}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate text-[15px] sm:text-base">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-400 md:hidden">Turma {student.classCode}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-[12.5rem] sm:max-w-xs">
                          {student._id}
                        </p>
                      </div>
                    </div>
                    <span className="hidden md:block text-sm text-slate-600">{student.classCode}</span>
                    <div className="justify-self-start md:justify-self-auto">
                      {student.isPresent ? (
                        <Badge variant="success" className="w-fit">
                          Presente
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="w-fit">
                          Ausente
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => openQr(student)}
                      disabled={loadingQr}
                      className="justify-self-end rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                      Ver QR
                    </button>
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

        {qrStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setQrStudent(null)}
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
              <Button variant="outline" className="w-full" onClick={() => setQrStudent(null)}>
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
