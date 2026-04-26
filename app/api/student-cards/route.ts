import { NextResponse } from 'next/server';
import { connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';

export async function GET() {
  try {
    const studentsConn = await connectStudentsDB();
    const Student = getStudentModel(studentsConn);
    const students = await Student.find({})
      .select('name classCode')
      .sort({ classCode: 1, name: 1 })
      .lean();

    return NextResponse.json({
      items: students.map((student) => ({
        _id: student._id.toString(),
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
