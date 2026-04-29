import { NextRequest, NextResponse } from 'next/server';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getAttendanceModel } from '@/lib/models/Attendance';
import { getMealModel } from '@/lib/models/Meal';
import { getPresenceModel } from '@/lib/models/Presence';
import { getLocalFallbackStudents, serializeDbStudent } from '@/lib/local-students';
import { getTodayString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Attendance = getAttendanceModel(platformConn);
  const Meal = getMealModel(platformConn);
  const Presence = getPresenceModel(platformConn);
  const today = getTodayString();
  const { searchParams } = new URL(req.url);
  const selectedDate = normalizeDate(searchParams.get('date')) || today;
  const isToday = selectedDate === today;

  const [dbStudents, presentStudents, todayMeals, hourlyData] = await Promise.all([
    Student.find({})
      .select('name classCode')
      .lean(),
    getPresentStudentsCount(selectedDate, isToday, Presence, Attendance),
    Meal.countDocuments({ date: selectedDate }),
    getHourlyAttendance(selectedDate, Attendance),
  ]);
  const totalStudents =
    dbStudents.length + getLocalFallbackStudents(dbStudents.map(serializeDbStudent)).length;

  const presentPercent =
    totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;
  const mealForecast = Math.round(presentStudents * 0.85);

  return NextResponse.json({
    totalStudents,
    presentStudents,
    presentPercent,
    todayMeals,
    mealForecast,
    hourlyData,
    date: selectedDate,
    isToday,
  });
}

function normalizeDate(date: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

async function getPresentStudentsCount(
  date: string,
  isToday: boolean,
  Presence: ReturnType<typeof getPresenceModel>,
  Attendance: ReturnType<typeof getAttendanceModel>
) {
  if (isToday) {
    return Presence.countDocuments({ date, isPresent: true });
  }

  const studentIds = await Attendance.distinct('studentId', { date, type: 'entry' });
  return studentIds.length;
}

async function getHourlyAttendance(
  date: string,
  Attendance: ReturnType<typeof getAttendanceModel>
) {
  const entries = await Attendance.find({ date, type: 'entry' }).lean();

  const hourCounts: Record<number, number> = {};
  for (let h = 6; h <= 18; h++) hourCounts[h] = 0;

  entries.forEach((e) => {
    const hour = new Date(e.timestamp).getHours();
    if (hour >= 6 && hour <= 18) {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour: `${hour}h`,
    entradas: count,
  }));
}
