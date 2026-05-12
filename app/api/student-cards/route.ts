import { NextRequest, NextResponse } from 'next/server';
import { connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getLocalFallbackStudents, serializeDbStudent } from '@/lib/local-students';
import { getRoleFromAccessKeyHeader } from '@/lib/iema-auth';

export async function GET(req: NextRequest) {
  if (getRoleFromAccessKeyHeader(req) !== 'gestao') {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  }
  try {
    const studentsConn = await connectStudentsDB();
    const Student = getStudentModel(studentsConn);
    const dbStudents = await Student.find({})
      .select('name classCode')
      .sort({ classCode: 1, name: 1 })
      .lean();
    const students = [
      ...dbStudents.map(serializeDbStudent),
      ...getLocalFallbackStudents(dbStudents.map(serializeDbStudent)),
    ].sort((a, b) => {
      const classCompare = a.classCode.localeCompare(b.classCode, 'pt-BR');
      return classCompare || a.name.localeCompare(b.name, 'pt-BR');
    });

    return NextResponse.json({
      items: students.map((student) => ({
        _id: student._id,
        name: student.name,
        classCode: student.classCode,
      })),
    });
  } catch (error) {
    console.error('GET /api/student-cards failed:', error);
    return NextResponse.json(
      { error: 'Falha ao carregar os cartões dos alunos.' },
      { status: 500 }
    );
  }
}
