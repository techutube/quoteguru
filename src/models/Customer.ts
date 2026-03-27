import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  title?: string;
  name: string;
  relationType?: string;
  relationName?: string;
  
  segment?: string;
  enquirySource?: string;
  gstCategory?: string;
  coDealer?: string;
  
  phone: string;
  phoneO?: string;
  phoneR?: string;
  email?: string;
  
  address?: string;
  placeOfSupply?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  locality?: string;

  dob?: Date;
  doa?: Date;
  
  pan?: string;
  gstin?: string;
  aadhaar?: string;
  tin?: string;
  
  nominee?: {
    name?: string;
    dob?: Date;
    relation?: string;
    reference?: string;
  };
  
  lsPoNo?: string;
  lsPoDate?: Date;
  tan?: string;
  accountGroup?: string;
  groupCode?: string;
  groupName?: string;

  history: Array<{
    changedBy: mongoose.Types.ObjectId;
    at: Date;
    changes: Record<string, { from: any; to: any }>;
  }>;
  createdAt: Date;
}

const CustomerSchema: Schema = new Schema({
  title: String,
  name: { type: String, required: true },
  relationType: { type: String, enum: ['S/o', 'W/o', 'D/o', 'C/o', ''] },
  relationName: String,
  
  segment: { type: String, enum: ['Individual', 'Corporate', ''] },
  enquirySource: String,
  gstCategory: String,
  coDealer: String,
  
  phone: { type: String, required: true },
  phoneO: String,
  phoneR: String,
  email: String,
  
  address: String,
  placeOfSupply: String,
  state: String,
  city: String,
  pinCode: String,
  locality: String,

  dob: Date,
  doa: Date,
  
  pan: String,
  gstin: String,
  aadhaar: String,
  tin: String,
  
  nominee: {
    name: String,
    dob: Date,
    relation: String,
    reference: String
  },
  
  lsPoNo: String,
  lsPoDate: Date,
  tan: String,
  accountGroup: String,
  groupCode: String,
  groupName: String,

  history: [
    {
      changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      at: { type: Date, default: Date.now },
      changes: { type: Map, of: Schema.Types.Mixed },
    },
  ],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
