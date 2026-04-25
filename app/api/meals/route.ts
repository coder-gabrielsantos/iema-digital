import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectPlatformDB, connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';
import { getMealModel } from '@/lib/models/Meal';
import { getTodayString } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const [studentsConn, platformConn] = await Promise.all([
    connectStudentsDB(),
    connectPlatformDB(),
  ]);
  const Student = getStudentModel(studentsConn);
  const Meal = getMealModel(platformConn);
  const { studentId } = await req.json();

  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json({ error: 'ID do aluno inválido' }, { status: 400 });
  }

  const student = await Student.findById(studentId);

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  }

  const today = getTodayString();
  const existingMeal = await Meal.findOne({ studentId: student._id.toString(), date: today });

  if (existingMeal) {
    return NextResponse.json(
      {
        error: 'Refeição já registrada',
        alreadyServed: true,
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
  });

  return NextResponse.json({
    success: true,
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
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || getTodayString();

  const meals = await Meal.find({ date }).sort({ timestamp: -1 }).lean();
  return NextResponse.json(meals);
}
