import { Connection, Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  studentId: string;
  studentName: string;
  classCode: string;
  type: 'entry' | 'exit';
  timestamp: Date;
  date: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    classCode: { type: String, required: true },
    type: { type: String, enum: ['entry', 'exit'], required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    date: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export function getAttendanceModel(connection: Connection): Model<IAttendance> {
  return (
    (connection.models.Attendance as Model<IAttendance> | undefined) ||
    connection.model<IAttendance>('Attendance', AttendanceSchema)
  );
}
