import { Connection, Schema, Document, Model } from 'mongoose';

export interface IMeal extends Document {
  studentId: string;
  studentName: string;
  classCode: string;
  timestamp: Date;
  date: string;
}

const MealSchema = new Schema<IMeal>(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    classCode: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    date: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

MealSchema.index({ studentId: 1, date: 1 }, { unique: true });

export function getMealModel(connection: Connection): Model<IMeal> {
  return (
    (connection.models.Meal as Model<IMeal> | undefined) ||
    connection.model<IMeal>('Meal', MealSchema)
  );
}
