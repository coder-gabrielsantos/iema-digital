import { NextRequest, NextResponse } from 'next/server';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getAttendanceModel } from '@/lib/models/Attendance';
import { getPresenceModel } from '@/lib/models/Presence';
import { resolveStudent } from '@/lib/local-students';
import { getEarlyExitMap } from '@/lib/early-exit';
import { getTodayString } from '@/lib/utils';
import { getRoleFromAccessKeyHeader } from '@/lib/iema-auth';

type TargetStatus = 'present' | 'early-exit';

export async function POST(req: NextRequest) {
  if (getRoleFromAccessKeyHeader(req) !== 'gestao') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  let body: { studentId?: unknown; targetStatus?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const targetStatus = body.targetStatus as TargetStatus;
  const today = getTodayString();

  if (!studentId || (targetStatus !== 'present' && targetStatus !== 'early-exit')) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Attendance = getAttendanceModel(platformConn);
  const Presence = getPresenceModel(platformConn);

  const resolution = await resolveStudent(Student, { studentId });
  if (resolution.status !== 'found') {
    return NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 });
  }

  const student = resolution.student;
  const sid = student._id.toString();

  const currentPresence = await Presence.findOne({ studentId: sid }).lean();
  const isPresenceFromToday = currentPresence?.date === today;
  const currentlyPresent = isPresenceFromToday && Boolean(currentPresence?.isPresent);

  const earlyExitMap = await getEarlyExitMap([sid], today, Attendance);
  const isEarlyExit = earlyExitMap.has(sid);

  const displayEarlyExit = isEarlyExit;
  const displayPresent = currentlyPresent && !displayEarlyExit;

  if (targetStatus === 'early-exit') {
    if (displayEarlyExit) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        studentId: sid,
        targetStatus,
      });
    }
    if (!currentlyPresent) {
      return NextResponse.json(
        { error: 'Só é possível registrar saída com o aluno presente.' },
        { status: 409 }
      );
    }

    const now = new Date();
    await Promise.all([
      Attendance.create({
        studentId: sid,
        studentName: student.name,
        classCode: student.classCode,
        type: 'exit',
        timestamp: now,
        date: today,
      }),
      Presence.findOneAndUpdate(
        { studentId: sid },
        { $set: { date: today, isPresent: false } },
        { upsert: true, new: true }
      ),
    ]);

    return NextResponse.json({
      success: true,
      studentId: sid,
      targetStatus,
    });
  }

  // present
  if (displayPresent) {
    return NextResponse.json({
      success: true,
      unchanged: true,
      studentId: sid,
      targetStatus,
    });
  }

  const now = new Date();
  await Promise.all([
    Attendance.create({
      studentId: sid,
      studentName: student.name,
      classCode: student.classCode,
      type: 'entry',
      timestamp: now,
      date: today,
    }),
    Presence.findOneAndUpdate(
      { studentId: sid },
      { $set: { date: today, isPresent: true } },
      { upsert: true, new: true }
    ),
  ]);

  return NextResponse.json({
    success: true,
    studentId: sid,
    targetStatus,
  });
}
