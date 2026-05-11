import { Connection, Document, Model, Schema } from 'mongoose';

export interface IEarlyExitJustification extends Document {
  studentId: string;
  studentName: string;
  classCode: string;
  date: string;
  justification: string;
  createdAt: Date;
  updatedAt: Date;
}

const EarlyExitJustificationSchema = new Schema<IEarlyExitJustification>(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    classCode: { type: String, required: true },
    date: { type: String, required: true, index: true },
    justification: { type: String, required: true },
  },
  { timestamps: true }
);

EarlyExitJustificationSchema.index({ studentId: 1, date: 1 }, { unique: true });

export function getEarlyExitJustificationModel(
  connection: Connection
): Model<IEarlyExitJustification> {
  return (
    (connection.models.EarlyExitJustification as Model<IEarlyExitJustification> | undefined) ||
    connection.model<IEarlyExitJustification>(
      'EarlyExitJustification',
      EarlyExitJustificationSchema
    )
  );
}
