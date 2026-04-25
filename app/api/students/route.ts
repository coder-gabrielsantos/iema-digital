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
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize') || '12')));

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

    const withPresence = students.map((s) => ({ ...s, isPresent: presentSet.has(s._id.toString()) }));

    const filtered = withPresence.filter((student) => {
      if (status === 'present') return student.isPresent;
      if (status === 'absent') return !student.isPresent;
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      items,
      summary: {
        total: withPresence.length,
        present: withPresence.filter((student) => student.isPresent).length,
        absent: withPresence.filter((student) => !student.isPresent).length,
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
