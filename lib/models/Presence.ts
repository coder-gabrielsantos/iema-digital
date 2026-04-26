import { Connection, Document, Model, Schema } from 'mongoose';

export interface IPresence extends Document {
  studentId: string;
  date: string;
  isPresent: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const PresenceSchema = new Schema<IPresence>(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    isPresent: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export function getPresenceModel(connection: Connection): Model<IPresence> {
  return (
    (connection.models.Presence as Model<IPresence> | undefined) ||
    connection.model<IPresence>('Presence', PresenceSchema)
  );
}
