import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getPresenceModel } from '@/lib/models/Presence';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Presence = getPresenceModel(platformConn);
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const student = await Student.findById(id).lean();

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  }

  const presence = await Presence.findOne({ studentId: id }).lean();
  return NextResponse.json({
    ...student,
    isPresent: Boolean(presence?.isPresent),
  });
}
