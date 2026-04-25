'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Users, CheckCircle2, XCircle, QrCode, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  isPresent: boolean;
}

interface StudentDetail extends Student {
  photoData: string;
}

type Filter = 'all' | 'present' | 'absent';

export default function AlunosPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [qrStudent, setQrStudent] = useState<StudentDetail | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter === 'present') params.set('present', 'true');
      const res = await fetch(`/api/students?${params}`);
      if (!res.ok) {
        throw new Error(`Falha ao carregar alunos (HTTP ${res.status})`);
      }
      const data: Student[] = await res.json();
      const list = filter === 'absent' ? data.filter((s) => !s.isPresent) : data;
      setStudents(list);
    } catch (e) {
      console.error(e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

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

  const presentCount = students.filter((s) => s.isPresent).length;

  return (
    <ProtectedLayout requiredRole="admin">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="gradient-text text-2xl font-bold">Alunos</h1>
            <p className="mt-1 text-sm text-slate-500">
              {students.length} alunos encontrados · {presentCount} presentes
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStudents} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{students.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Presentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-400">{students.length - presentCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ausentes</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou turma..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="app-panel flex gap-1 p-1">
            {(['all', 'present', 'absent'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-[#4F46E5] text-white shadow-sm shadow-indigo-950/10 hover:bg-[#4338CA]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'present' ? 'Presentes' : 'Ausentes'}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
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
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">Nenhum aluno encontrado</p>
                <p className="text-sm mt-1">Verifique a conexão com o banco de dados</p>
              </div>
            ) : (
              <div>
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <span>Aluno</span>
                  <span>Turma</span>
                  <span>Status</span>
                  <span>QR Code</span>
                </div>
                {students.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors md:grid md:grid-cols-[2fr_1fr_1fr_auto]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StudentPhoto
                        name={student.name}
                        photoMime={student.photoMime}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{student.name}</p>
                        <p className="text-xs text-slate-400 md:hidden">Turma {student.classCode}</p>
                        <p className="text-xs text-slate-400 font-mono truncate">{student._id}</p>
                      </div>
                    </div>
                    <span className="hidden md:block text-sm text-slate-600">{student.classCode}</span>
                    <div>
                      {student.isPresent ? (
                        <Badge variant="success" className="flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Presente
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          Ausente
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => openQr(student)}
                      disabled={loadingQr}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                      <QrCode className="h-4 w-4" />
                      <span className="hidden md:inline">Ver QR</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {qrStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setQrStudent(null)}
          >
            <div
              className="app-panel max-w-xs w-full rounded-2xl p-8 text-center shadow-premium-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <StudentPhoto
                name={qrStudent.name}
                photoData={qrStudent.photoData}
                photoMime={qrStudent.photoMime}
                size="xl"
                className="mx-auto mb-4 ring-4 ring-slate-100 shadow-md"
              />
              <h3 className="font-bold text-slate-900 text-lg mb-0.5">{qrStudent.name}</h3>
              <p className="text-sm text-slate-500 mb-1">Turma {qrStudent.classCode}</p>
              <p className="text-xs text-slate-400 font-mono mb-6 break-all">{qrStudent._id}</p>
              <div className="flex justify-center mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
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
    </ProtectedLayout>
  );
}
