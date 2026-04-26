import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getMealModel } from '@/lib/models/Meal';
import { getTodayString } from '@/lib/utils';

type MealPeriod = 'morning' | 'lunch' | 'afternoon';

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const PERIOD_LABEL: Record<MealPeriod, string> = {
  morning: 'manhã',
  lunch: 'almoço',
  afternoon: 'tarde',
};

let indexSyncPromise: Promise<void> | null = null;

function getNowInSaoPauloParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    hour: Number(values.hour ?? '0'),
    minute: Number(values.minute ?? '0'),
  };
}

function getCurrentMealPeriod(): MealPeriod {
  const { hour } = getNowInSaoPauloParts();
  if (hour < 11) return 'morning';
  if (hour < 14) return 'lunch';
  return 'afternoon';
}

async function ensureMealIndexes(Meal: ReturnType<typeof getMealModel>) {
  if (!indexSyncPromise) {
    indexSyncPromise = (async () => {
      const existingIndexes = await Meal.collection.indexes();
      const legacyUniqueByDay = existingIndexes.find(
        (index) => index.name === 'studentId_1_date_1' && index.unique
      );
      if (legacyUniqueByDay) {
        await Meal.collection.dropIndex('studentId_1_date_1');
      }
      await Meal.syncIndexes();
    })().catch((error) => {
      indexSyncPromise = null;
      throw error;
    });
  }
  await indexSyncPromise;
}

export async function POST(req: NextRequest) {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Meal = getMealModel(platformConn);
  await ensureMealIndexes(Meal);
  const { studentId, studentName } = await req.json();
  const hasStudentId = typeof studentId === 'string' && studentId.trim().length > 0;
  const hasStudentName = typeof studentName === 'string' && studentName.trim().length > 0;

  if (!hasStudentId && !hasStudentName) {
    return NextResponse.json(
      { error: 'Informe um identificador válido do aluno' },
      { status: 400 }
    );
  }

  let student = null;

  if (hasStudentId) {
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'ID do aluno inválido' }, { status: 400 });
    }
    student = await Student.findById(studentId);
  } else {
    const normalizedName = studentName.trim();
    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactMatches = await Student.find({
      name: { $regex: `^${escapedName}$`, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(2);

    if (exactMatches.length > 1) {
      return NextResponse.json(
        { error: 'Mais de um aluno encontrado com esse nome. Seja mais específico.' },
        { status: 409 }
      );
    }

    if (exactMatches.length === 1) {
      student = exactMatches[0];
    } else {
      student = await Student.findOne({
        name: { $regex: escapedName, $options: 'i' },
      }).sort({ createdAt: -1 });
    }
  }

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  }

  const today = getTodayString();
  const mealPeriod = getCurrentMealPeriod();
  const existingMeal = await Meal.findOne({
    studentId: student._id.toString(),
    date: today,
    mealPeriod,
  });

  if (existingMeal) {
    return NextResponse.json(
      {
        error: `Refeição da ${PERIOD_LABEL[mealPeriod]} já registrada`,
        alreadyServed: true,
        mealPeriod,
        student: {
          studentId: student._id.toString(),
          name: student.name,
          classCode: student.classCode,
          photoMime: student.photoMime,
          photoData: student.photoData,
        },
        meal: existingMeal,
      },
      { status: 409 }
    );
  }

  const meal = await Meal.create({
    studentId: student._id.toString(),
    studentName: student.name,
    classCode: student.classCode,
    timestamp: new Date(),
    date: today,
    mealPeriod,
  });

  return NextResponse.json({
    success: true,
    mealPeriod,
    student: {
      studentId: student._id.toString(),
      name: student.name,
      classCode: student.classCode,
      photoMime: student.photoMime,
      photoData: student.photoData,
    },
    meal,
  });
}

export async function GET(req: NextRequest) {
  const platformConn = await connectPlatformDB();
  const Meal = getMealModel(platformConn);
  await ensureMealIndexes(Meal);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || getTodayString();

  const meals = await Meal.find({ date }).sort({ timestamp: -1 }).lean();
  return NextResponse.json(meals);
}
