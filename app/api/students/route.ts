import { NextRequest, NextResponse } from 'next/server';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getPresenceModel } from '@/lib/models/Presence';

export async function GET(req: NextRequest) {
  try {
    const [studentsConn, platformConn] = await Promise.all([
      connectStudentsDB(),
      connectPlatformDB(),
    ]);
    const Student = getStudentModel(studentsConn);
    const Presence = getPresenceModel(platformConn);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const presentOnly = searchParams.get('present') === 'true';

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { classCode: { $regex: search, $options: 'i' } },
      ];
    }
    const students = await Student.find(query)
      .select('-photoData')
      .sort({ name: 1 })
      .lean();

    const studentIds = students.map((s) => s._id.toString());
    const presenceRecords = await Presence.find({ studentId: { $in: studentIds }, isPresent: true })
      .select('studentId')
      .lean();
    const presentSet = new Set(presenceRecords.map((p) => p.studentId));

    const withPresence = students
      .map((s) => ({ ...s, isPresent: presentSet.has(s._id.toString()) }))
      .filter((s) => (presentOnly ? s.isPresent : true));

    return NextResponse.json(withPresence);
  } catch (error) {
    console.error('GET /api/students failed:', error);
    return NextResponse.json(
      { error: 'Falha ao consultar alunos. Verifique a conexao com o banco de dados.' },
      { status: 500 }
    );
  }
}
