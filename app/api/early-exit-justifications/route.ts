import { NextRequest, NextResponse } from 'next/server';
import { connectPlatformDB } from '@/lib/mongodb-connections';
import { getEarlyExitJustificationModel } from '@/lib/models/EarlyExitJustification';

const MAX_JUSTIFICATION_LENGTH = 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const studentId = normalizeString(body.studentId);
    const studentName = normalizeString(body.studentName);
    const classCode = normalizeString(body.classCode);
    const date = normalizeDate(body.date);
    const justification = normalizeString(body.justification);

    if (!studentId || !studentName || !classCode || !date) {
      return NextResponse.json(
        { error: 'Dados da justificativa incompletos.' },
        { status: 400 }
      );
    }

    if (!justification) {
      return NextResponse.json(
        { error: 'Informe a justificativa da saída antecipada.' },
        { status: 400 }
      );
    }

    if (justification.length > MAX_JUSTIFICATION_LENGTH) {
      return NextResponse.json(
        { error: `A justificativa deve ter até ${MAX_JUSTIFICATION_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const platformConn = await connectPlatformDB();
    const EarlyExitJustification = getEarlyExitJustificationModel(platformConn);
    const saved = await EarlyExitJustification.findOneAndUpdate(
      { studentId, date },
      { $set: { studentId, studentName, classCode, date, justification } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return NextResponse.json({
      studentId: saved.studentId,
      date: saved.date,
      justification: saved.justification,
    });
  } catch (error) {
    console.error('POST /api/early-exit-justifications failed:', error);
    return NextResponse.json(
      { error: 'Falha ao salvar justificativa de saída antecipada.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const studentId = normalizeString(body.studentId);
    const date = normalizeDate(body.date);

    if (!studentId || !date) {
      return NextResponse.json(
        { error: 'Dados da justificativa incompletos.' },
        { status: 400 }
      );
    }

    const platformConn = await connectPlatformDB();
    const EarlyExitJustification = getEarlyExitJustificationModel(platformConn);
    await EarlyExitJustification.deleteOne({ studentId, date });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/early-exit-justifications failed:', error);
    return NextResponse.json(
      { error: 'Falha ao apagar justificativa de saída antecipada.' },
      { status: 500 }
    );
  }
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return value;
}
