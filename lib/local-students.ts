import crypto from 'crypto';
import type { Model } from 'mongoose';
import studentNamesByClass from '@/app/data/studentNamesByClass.json';
import type { IStudent } from '@/lib/models/Student';

export const LOCAL_STUDENT_ID_PREFIX = 'local-student-';
export const DEFAULT_LOCAL_STUDENT_PHOTO_MIME = 'image/svg+xml';

const defaultStudentPhotoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="#e2e8f0"/>
  <circle cx="80" cy="62" r="30" fill="#94a3b8"/>
  <path d="M32 140c7-31 27-48 48-48s41 17 48 48" fill="#94a3b8"/>
</svg>`;

export const DEFAULT_LOCAL_STUDENT_PHOTO_DATA = Buffer.from(defaultStudentPhotoSvg).toString('base64');

export interface StudentIdentity {
  name: string;
  classCode: string;
}

export interface AppStudent extends StudentIdentity {
  _id: string;
  photoMime: string;
  photoData: string;
  isLocalFallback?: boolean;
}

export type StudentResolution =
  | { status: 'found'; student: AppStudent }
  | { status: 'not-found' }
  | { status: 'ambiguous' }
  | { status: 'invalid-id' };

type StudentModel = Model<IStudent>;
type RawStudent = {
  _id: unknown;
  name?: unknown;
  classCode?: unknown;
  photoMime?: unknown;
  photoData?: unknown;
};

const localStudents = Object.entries(studentNamesByClass as Record<string, string[]>).flatMap(
  ([classCode, names]) =>
    names.map((name) => ({
      _id: buildLocalStudentId(name, classCode),
      name,
      classCode,
      photoMime: DEFAULT_LOCAL_STUDENT_PHOTO_MIME,
      photoData: DEFAULT_LOCAL_STUDENT_PHOTO_DATA,
      isLocalFallback: true,
    }))
);

export function buildLocalStudentId(name: string, classCode: string) {
  const hash = crypto
    .createHash('sha256')
    .update(`${normalizeForMatch(classCode)}|${normalizeForMatch(name)}`)
    .digest('hex')
    .slice(0, 16);

  return `${LOCAL_STUDENT_ID_PREFIX}${hash}`;
}

export function isLocalStudentId(id: string) {
  return id.startsWith(LOCAL_STUDENT_ID_PREFIX);
}

export function getLocalStudents() {
  return localStudents;
}

export function normalizeForMatch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getStudentKey(student: StudentIdentity) {
  return `${normalizeForMatch(student.classCode)}|${normalizeForMatch(student.name)}`;
}

export function serializeDbStudent(student: RawStudent): AppStudent {
  return {
    _id: String(student._id),
    name: String(student.name ?? ''),
    classCode: String(student.classCode ?? ''),
    photoMime: String(student.photoMime ?? 'image/jpeg'),
    photoData: typeof student.photoData === 'string' ? student.photoData : '',
  };
}

export function getLocalFallbackStudents(
  dbStudents: StudentIdentity[],
  filters: { search?: string; classCode?: string } = {}
) {
  const dbKeys = new Set(dbStudents.map(getStudentKey));
  const normalizedSearch = normalizeForMatch(filters.search ?? '');
  const normalizedClassCode = normalizeForMatch(filters.classCode ?? '');

  return localStudents.filter((student) => {
    if (dbKeys.has(getStudentKey(student))) return false;
    if (normalizedClassCode && normalizeForMatch(student.classCode) !== normalizedClassCode) return false;
    if (normalizedSearch && !normalizeForMatch(student.name).includes(normalizedSearch)) return false;
    return true;
  });
}

export function mergeClassCodes(dbClassCodes: unknown[]) {
  return [
    ...new Set([
      ...dbClassCodes.filter((code): code is string => typeof code === 'string' && code.trim().length > 0),
      ...localStudents.map((student) => student.classCode),
    ]),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function resolveStudent(
  Student: StudentModel,
  input: { studentId?: string; studentName?: string }
): Promise<StudentResolution> {
  const studentId = input.studentId?.trim();
  const studentName = input.studentName?.trim();

  if (studentId) {
    if (isLocalStudentId(studentId)) {
      const localStudent = localStudents.find((student) => student._id === studentId);
      if (!localStudent) return { status: 'not-found' };

      const dbStudent = await findDbStudentByLocalStudent(Student, localStudent);
      return { status: 'found', student: dbStudent ?? localStudent };
    }

    if (!/^[a-fA-F0-9]{24}$/.test(studentId)) {
      return { status: 'invalid-id' };
    }

    const dbStudent = await Student.findById(studentId).lean();
    return dbStudent
      ? { status: 'found', student: serializeDbStudent(dbStudent) }
      : { status: 'not-found' };
  }

  if (!studentName) return { status: 'not-found' };

  const escapedName = escapeRegex(studentName);
  const exactMatches = await Student.find({
    name: { $regex: `^${escapedName}$`, $options: 'i' },
  })
    .sort({ createdAt: -1 })
    .limit(2)
    .lean();

  if (exactMatches.length > 1) return { status: 'ambiguous' };
  if (exactMatches.length === 1) {
    return { status: 'found', student: serializeDbStudent(exactMatches[0]) };
  }

  const localExactMatches = localStudents.filter(
    (student) => normalizeForMatch(student.name) === normalizeForMatch(studentName)
  );
  if (localExactMatches.length > 1) return { status: 'ambiguous' };
  if (localExactMatches.length === 1) {
    const dbStudent = await findDbStudentByLocalStudent(Student, localExactMatches[0]);
    return { status: 'found', student: dbStudent ?? localExactMatches[0] };
  }

  const dbPartialMatch = await Student.findOne({
    name: { $regex: escapedName, $options: 'i' },
  })
    .sort({ createdAt: -1 })
    .lean();
  if (dbPartialMatch) {
    return { status: 'found', student: serializeDbStudent(dbPartialMatch) };
  }

  const normalizedName = normalizeForMatch(studentName);
  const localPartialMatches = localStudents.filter((student) =>
    normalizeForMatch(student.name).includes(normalizedName)
  );
  if (localPartialMatches.length > 1) return { status: 'ambiguous' };
  if (localPartialMatches.length === 1) {
    const dbStudent = await findDbStudentByLocalStudent(Student, localPartialMatches[0]);
    return { status: 'found', student: dbStudent ?? localPartialMatches[0] };
  }

  return { status: 'not-found' };
}

async function findDbStudentByLocalStudent(Student: StudentModel, localStudent: StudentIdentity) {
  const candidates = await Student.find({ classCode: localStudent.classCode })
    .select('name classCode photoMime photoData')
    .lean();
  const matchingStudent = candidates.find(
    (student) => getStudentKey(serializeDbStudent(student)) === getStudentKey(localStudent)
  );

  return matchingStudent ? serializeDbStudent(matchingStudent) : null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
