import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getAttendanceModel } from '@/lib/models/Attendance';
import { getPresenceModel } from '@/lib/models/Presence';
import { getTodayString } from '@/lib/utils';

const STATUS_LOCK_WINDOW_MS = 5 * 60 * 1000;

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

  let student = null;

  if (hasStudentId) {
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'ID do aluno inválido' }, { status: 400 });
    }
    student = await Student.findById(studentId);
  } else {
    const normalizedName = studentName.trim();
    const exactMatches = await Student.find({
      name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(2);

    if (exactMatches.length > 1) {
      return NextResponse.json(
        { error: 'Mais de um aluno encontrado com esse nome. Seja mais específico.' },
        { status: 409 }
      );
    }

    if (exactMatches.length === 1) {
      student = exactMatches[0];
    } else {
      student = await Student.findOne({
        name: { $regex: normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      }).sort({ createdAt: -1 });
    }
  }

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  }

  const currentPresence = await Presence.findOne({ studentId: student._id.toString() }).lean();
  const currentlyPresent = Boolean(currentPresence?.isPresent);
  const type = currentlyPresent ? 'exit' : 'entry';
  const now = new Date();
  const lastStatusUpdate =
    currentPresence?.updatedAt instanceof Date
      ? currentPresence.updatedAt
      : currentPresence?.updatedAt
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
      date: getTodayString(),
    }),
    Presence.findOneAndUpdate(
      { studentId: student._id.toString() },
      { $set: { isPresent: !currentlyPresent } },
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
