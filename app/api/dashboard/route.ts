import { NextResponse } from 'next/server';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getAttendanceModel } from '@/lib/models/Attendance';
import { getMealModel } from '@/lib/models/Meal';
import { getPresenceModel } from '@/lib/models/Presence';
import { getTodayString } from '@/lib/utils';

export async function GET() {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Attendance = getAttendanceModel(platformConn);
  const Meal = getMealModel(platformConn);
  const Presence = getPresenceModel(platformConn);
  const today = getTodayString();

  const [totalStudents, presentStudents, todayMeals, hourlyData] = await Promise.all([
    Student.countDocuments(),
    Presence.countDocuments({ isPresent: true }),
    Meal.countDocuments({ date: today }),
    getHourlyAttendance(today, Attendance),
  ]);

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
  });
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
