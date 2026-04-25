import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getAttendanceModel } from '@/lib/models/Attendance';
import { getPresenceModel } from '@/lib/models/Presence';
import { getTodayString } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Attendance = getAttendanceModel(platformConn);
  const Presence = getPresenceModel(platformConn);
  const { studentId } = await req.json();

  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json({ error: 'ID do aluno inválido' }, { status: 400 });
  }

  const student = await Student.findById(studentId);

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  }

  const currentPresence = await Presence.findOne({ studentId: student._id.toString() }).lean();
  const currentlyPresent = Boolean(currentPresence?.isPresent);
  const type = currentlyPresent ? 'exit' : 'entry';

  await Attendance.create({
    studentId: student._id.toString(),
    studentName: student.name,
    classCode: student.classCode,
    type,
    timestamp: new Date(),
    date: getTodayString(),
  });

  await Presence.findOneAndUpdate(
    { studentId: student._id.toString() },
    { $set: { isPresent: !currentlyPresent } },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    success: true,
    type,
    student: {
      studentId: student._id.toString(),
      name: student.name,
      classCode: student.classCode,
      photoMime: student.photoMime,
      photoData: student.photoData,
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
