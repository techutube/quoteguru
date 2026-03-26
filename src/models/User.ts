import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'Owner' | 'GM' | 'GSM' | 'Sales Manager' | 'Team Lead' | 'F&I Manager' | 'Sales Associate' | 'Admin' | 'Super Admin';
  reportsTo?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Owner', 'GM', 'GSM', 'Sales Manager', 'Team Lead', 'F&I Manager', 'Sales Associate', 'Admin', 'Super Admin'], 
    default: 'Sales Associate' 
  },
  reportsTo: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
