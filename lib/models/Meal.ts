import { Connection, Schema, Document, Model } from 'mongoose';

export interface IMeal extends Document {
  studentId: string;
  studentName: string;
  classCode: string;
  timestamp: Date;
  date: string;
  mealPeriod: 'morning' | 'lunch' | 'afternoon';
}

const MealSchema = new Schema<IMeal>(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    classCode: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    date: { type: String, required: true, index: true },
    mealPeriod: {
      type: String,
      required: true,
      enum: ['morning', 'lunch', 'afternoon'],
      index: true,
    },
  },
  { timestamps: true }
);

MealSchema.index({ studentId: 1, date: 1, mealPeriod: 1 }, { unique: true, name: 'meal_unique_by_period' });

export function getMealModel(connection: Connection): Model<IMeal> {
  return (
    (connection.models.Meal as Model<IMeal> | undefined) ||
    connection.model<IMeal>('Meal', MealSchema)
  );
}
