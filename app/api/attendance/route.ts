import { NextRequest, NextResponse } from 'next/server';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getAttendanceModel } from '@/lib/models/Attendance';
import { getPresenceModel } from '@/lib/models/Presence';
import { resolveStudent } from '@/lib/local-students';
import { getTodayString } from '@/lib/utils';
import { getRoleFromAccessKeyHeader } from '@/lib/iema-auth';

const STATUS_LOCK_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Attendance = getAttendanceModel(platformConn);
  const Presence = getPresenceModel(platformConn);
  const { studentId, studentName } = await req.json();

  const hasStudentId = typeof studentId === 'string' && studentId.trim().length > 0;
  const hasStudentName = typeof studentName === 'string' && studentName.trim().length > 0;

  if (!hasStudentId && !hasStudentName) {
    return NextResponse.json(
      { error: 'Informe um identificador válido do aluno' },
      { status: 400 }
    );
  }

  const resolution = await resolveStudent(
    Student,
    hasStudentId ? { studentId: studentId.trim() } : { studentName: studentName.trim() }
  );

  if (resolution.status === 'invalid-id') {
    return NextResponse.json({ error: 'ID do aluno inválido' }, { status: 400 });
  }

  if (resolution.status === 'ambiguous') {
    return NextResponse.json(
      { error: 'Mais de um aluno encontrado com esse nome. Seja mais específico.' },
      { status: 409 }
    );
  }

  if (resolution.status !== 'found') {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  }

  const student = resolution.student;
  const today = getTodayString();
  const currentPresence = await Presence.findOne({ studentId: student._id }).lean();
  const currentPresenceDate = currentPresence?.date || '';
  const isPresenceFromToday = currentPresenceDate === today;
  const currentlyPresent = isPresenceFromToday && Boolean(currentPresence?.isPresent);
  const type = currentlyPresent ? 'exit' : 'entry';
  const requesterRole = getRoleFromAccessKeyHeader(req);
  if (type === 'exit' && requesterRole !== 'gestao') {
    return NextResponse.json(
      { error: 'Não foi possível registrar a saída com este acesso.' },
      { status: 403 }
    );
  }
  const now = new Date();
  const lastStatusUpdate =
    isPresenceFromToday && currentPresence?.updatedAt instanceof Date
      ? currentPresence.updatedAt
      : isPresenceFromToday && currentPresence?.updatedAt
      ? new Date(currentPresence.updatedAt)
      : null;

  if (lastStatusUpdate && now.getTime() - lastStatusUpdate.getTime() < STATUS_LOCK_WINDOW_MS) {
    return NextResponse.json({
      success: true,
      blockedByTimeWindow: true,
      student: {
        studentId: student._id.toString(),
        name: student.name,
        classCode: student.classCode,
        isPresent: currentlyPresent,
      },
    });
  }

  await Promise.all([
    Attendance.create({
      studentId: student._id.toString(),
      studentName: student.name,
      classCode: student.classCode,
      type,
      timestamp: now,
      date: today,
    }),
    Presence.findOneAndUpdate(
      { studentId: student._id.toString() },
      { $set: { date: today, isPresent: !currentlyPresent } },
      { upsert: true, new: true }
    ),
  ]);

  return NextResponse.json({
    success: true,
    type,
    student: {
      studentId: student._id.toString(),
      name: student.name,
      classCode: student.classCode,
      isPresent: !currentlyPresent,
    },
  });
}

export async function GET(req: NextRequest) {
  const platformConn = await connectPlatformDB();
  const Attendance = getAttendanceModel(platformConn);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || getTodayString();

  const records = await Attendance.find({ date }).sort({ timestamp: -1 }).lean();
  return NextResponse.json(records);
}
