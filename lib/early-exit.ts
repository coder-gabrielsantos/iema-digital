import { getAttendanceModel } from '@/lib/models/Attendance';

type AttendanceModel = ReturnType<typeof getAttendanceModel>;

const EARLY_EXIT_CUTOFF_HOUR = 17;
const INSTITUTION_TIME_ZONE = 'America/Sao_Paulo';

export async function getEarlyExitMap(
  studentIds: string[],
  date: string,
  Attendance: AttendanceModel
) {
  if (studentIds.length === 0) return new Map<string, string>();

  const records = await Attendance.find({
    studentId: { $in: studentIds },
    date,
  })
    .select('studentId type timestamp')
    .sort({ timestamp: -1 })
    .lean();

  const latestByStudent = new Map<
    string,
    { type: 'entry' | 'exit'; timestamp: Date | string }
  >();

  for (const record of records) {
    const studentId = String(record.studentId);
    if (latestByStudent.has(studentId)) continue;
    latestByStudent.set(studentId, {
      type: record.type,
      timestamp: record.timestamp,
    });
  }

  const earlyExitMap = new Map<string, string>();

  for (const [studentId, record] of latestByStudent.entries()) {
    const exitDate = new Date(record.timestamp);
    if (record.type === 'exit' && isBeforeEarlyExitCutoff(exitDate)) {
      earlyExitMap.set(studentId, exitDate.toISOString());
    }
  }

  return earlyExitMap;
}

function isBeforeEarlyExitCutoff(date: Date) {
  if (Number.isNaN(date.getTime())) return false;

  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone: INSTITUTION_TIME_ZONE,
    hour: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour');

  const hour = Number(hourPart?.value);
  const normalizedHour = hour === 24 ? 0 : hour;
  return normalizedHour < EARLY_EXIT_CUTOFF_HOUR;
}
