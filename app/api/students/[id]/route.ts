import { NextRequest, NextResponse } from 'next/server';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getPresenceModel } from '@/lib/models/Presence';
import { isLocalStudentId, resolveStudent, serializeDbStudent } from '@/lib/local-students';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Presence = getPresenceModel(platformConn);
  const { id } = await params;

  if (!isLocalStudentId(id) && !/^[a-fA-F0-9]{24}$/.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const resolution = isLocalStudentId(id)
    ? await resolveStudent(Student, { studentId: id })
    : await Student.findById(id).lean().then((student) =>
        student
          ? ({ status: 'found', student: serializeDbStudent(student) } as const)
          : ({ status: 'not-found' } as const)
      );

  if (resolution.status !== 'found') {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  }

  const student = resolution.student;
  const presence = await Presence.findOne({ studentId: student._id }).lean();
  return NextResponse.json({
    ...student,
    isPresent: Boolean(presence?.isPresent),
  });
}
