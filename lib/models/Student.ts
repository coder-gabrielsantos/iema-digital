import mongoose, { Connection, Schema, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  classCode: string;
  photoMime: string;
  photoData: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true },
    classCode: { type: String, required: true, index: true },
    photoMime: { type: String, default: 'image/jpeg' },
    photoData: { type: String, default: '' },
  },
  {
    timestamps: true,
    // Use the existing 'test' collection called 'students'
    collection: 'students',
  }
);

export function getStudentModel(connection: Connection): Model<IStudent> {
  return (
    (connection.models.Student as Model<IStudent> | undefined) ||
    connection.model<IStudent>('Student', StudentSchema)
  );
}
