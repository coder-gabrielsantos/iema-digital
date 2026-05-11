import { NextRequest, NextResponse } from 'next/server';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getAttendanceModel } from '@/lib/models/Attendance';
import { getPresenceModel } from '@/lib/models/Presence';
import { getAbsenceJustificationModel } from '@/lib/models/AbsenceJustification';
import { getEarlyExitJustificationModel } from '@/lib/models/EarlyExitJustification';
import {
  getLocalFallbackStudents,
  mergeClassCodes,
  serializeDbStudent,
} from '@/lib/local-students';
import { getEarlyExitMap } from '@/lib/early-exit';
import { getTodayString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const [studentsConn, platformConn] = await Promise.all([
      connectStudentsDB(),
      connectPlatformDB(),
    ]);
    const Student = getStudentModel(studentsConn);
    const Attendance = getAttendanceModel(platformConn);
    const Presence = getPresenceModel(platformConn);
    const AbsenceJustification = getAbsenceJustificationModel(platformConn);
    const EarlyExitJustification = getEarlyExitJustificationModel(platformConn);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const classCodeFilter = (searchParams.get('classCode') || '').trim();
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize') || '12')));
    const today = getTodayString();
    const selectedDate = normalizeDate(searchParams.get('date')) || today;
    const isToday = selectedDate === today;

    const query: Record<string, unknown> = classCodeFilter
      ? { classCode: classCodeFilter }
      : {};

    const [dbStudents, allDbStudents, rawClassCodes] = await Promise.all([
      Student.find(query)
        .select('name classCode photoMime')
        .sort({ name: 1 })
        .lean(),
      Student.find({})
        .select('name classCode')
        .lean(),
      Student.distinct('classCode'),
    ]);

    const classCodes = mergeClassCodes(rawClassCodes);
    const localStudents = getLocalFallbackStudents(
      allDbStudents.map(serializeDbStudent),
      { search: '', classCode: classCodeFilter }
    );
    const students = [
      ...dbStudents.map(serializeDbStudent),
      ...localStudents,
    ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const normalizedSearch = normalizeSearchText(search);
    const searchableStudents = normalizedSearch
      ? students.filter((student) => normalizeSearchText(student.name).includes(normalizedSearch))
      : students;

    const studentIds = searchableStudents.map((s) => s._id.toString());
    const [presentSet, earlyExitMap] = await Promise.all([
      getPresentStudentSet(studentIds, selectedDate, isToday, Presence, Attendance),
      getEarlyExitMap(studentIds, selectedDate, Attendance),
    ]);

    const withPresence = searchableStudents.map((s) => {
      const studentId = s._id.toString();
      return {
        ...s,
        isPresent: presentSet.has(studentId),
        earlyExitTime: earlyExitMap.get(studentId),
      };
    });

    const filtered = withPresence.filter((student) => {
      if (status === 'present') return student.isPresent;
      if (status === 'absent') return !student.isPresent;
      if (status === 'early-exit') return Boolean(student.earlyExitTime);
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    const pageDbIds = pageItems
      .filter((student) => !student.isLocalFallback)
      .map((student) => student._id);
    const pageStudentIds = pageItems.map((student) => student._id.toString());
    const [pagePhotos, absenceJustifications, earlyExitJustifications] = await Promise.all([
      Student.find({ _id: { $in: pageDbIds } })
        .select('_id photoData')
        .lean(),
      AbsenceJustification.find({
        studentId: { $in: pageStudentIds },
        date: selectedDate,
      })
        .select('studentId justification')
        .lean(),
      EarlyExitJustification.find({
        studentId: { $in: pageStudentIds },
        date: selectedDate,
      })
        .select('studentId justification')
        .lean(),
    ]);
    const photoMap = new Map(pagePhotos.map((student) => [student._id.toString(), student.photoData]));
    const justificationMap = new Map(
      absenceJustifications.map((item) => [item.studentId, item.justification])
    );
    const earlyExitJustificationMap = new Map(
      earlyExitJustifications.map((item) => [item.studentId, item.justification])
    );
    const items = pageItems.map((student) => ({
      ...student,
      photoData: student.isLocalFallback
        ? student.photoData
        : photoMap.get(student._id.toString()) || '',
      absenceJustification: justificationMap.get(student._id.toString()) || '',
      earlyExitJustification: earlyExitJustificationMap.get(student._id.toString()) || '',
    }));

    return NextResponse.json({
      items,
      classCodes,
      summary: {
        total: withPresence.length,
        present: withPresence.filter((student) => student.isPresent).length,
        absent: withPresence.filter((student) => !student.isPresent).length,
        earlyExit: withPresence.filter((student) => student.earlyExitTime).length,
        date: selectedDate,
        isToday,
      },
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/students failed:', error);
    return NextResponse.json(
      { error: 'Falha ao consultar alunos. Verifique a conexão com o banco de dados.' },
      { status: 500 }
    );
  }
}

function normalizeDate(date: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function getPresentStudentSet(
  studentIds: string[],
  date: string,
  isToday: boolean,
  Presence: ReturnType<typeof getPresenceModel>,
  Attendance: ReturnType<typeof getAttendanceModel>
) {
  if (studentIds.length === 0) return new Set<string>();

  if (isToday) {
    const presenceRecords = await Presence.find({
      studentId: { $in: studentIds },
      date,
      isPresent: true,
    })
      .select('studentId')
      .lean();

    return new Set(presenceRecords.map((p) => p.studentId));
  }

  const attendedStudentIds = await Attendance.distinct('studentId', {
    studentId: { $in: studentIds },
    date,
    type: 'entry',
  });

  return new Set(attendedStudentIds.map(String));
}
