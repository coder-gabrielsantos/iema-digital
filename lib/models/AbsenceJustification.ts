import { Connection, Document, Model, Schema } from 'mongoose';

export interface IAbsenceJustification extends Document {
  studentId: string;
  studentName: string;
  classCode: string;
  date: string;
  justification: string;
  createdAt: Date;
  updatedAt: Date;
}

const AbsenceJustificationSchema = new Schema<IAbsenceJustification>(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    classCode: { type: String, required: true },
    date: { type: String, required: true, index: true },
    justification: { type: String, required: true },
  },
  { timestamps: true }
);

AbsenceJustificationSchema.index({ studentId: 1, date: 1 }, { unique: true });

export function getAbsenceJustificationModel(
  connection: Connection
): Model<IAbsenceJustification> {
  return (
    (connection.models.AbsenceJustification as Model<IAbsenceJustification> | undefined) ||
    connection.model<IAbsenceJustification>(
      'AbsenceJustification',
      AbsenceJustificationSchema
    )
  );
}
