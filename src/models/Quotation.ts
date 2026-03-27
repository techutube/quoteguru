import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotation extends Document {
  quotationNumber: string;
  customer: mongoose.Types.ObjectId;
  salesperson: mongoose.Types.ObjectId;
  
  // Enq & Location Details
  location: {
    showroom?: string;
    placeOfSupply?: string;
    state?: string;
  };
  enquiryDetails: {
    source?: string;
    gstCategory?: string;
    relation?: string;
    relationName?: string;
  };
  
  // Car Details
  car: mongoose.Types.ObjectId;
  selectedColor: string;
  
  // Array of accessories
  accessories: mongoose.Types.ObjectId[];
  
  // Charges & Pricing
  charges: {
    registration: number;
    insurance: number;
    handling: number;
    fastag: number;
    extendedWarranty: number;
  };
  
  discounts: {
    dealer: number;
    exchangeBonus: number;
    corporate: number;
    festival: number;
    managerSpecial: number;
  };
  
  // Exchange
  exchangeVehicle?: {
    brand: string;
    model: string;
    year: number;
    condition: string;
    expectedValue: number;
  };
  
  // Finance
  finance?: {
    type?: string;
    agentType?: string;
    financer?: string;
    downPayment: number;
    loanAmount: number;
    interestRate: number;
    tenureYears: number;
  };
  
  // Calculated Totals (Stored for historical accuracy even if base prices change)
  pricing: {
    exShowroom: number;
    accessoriesTotal: number;
    chargesTotal: number;
    subTotal: number;
    gstTotal: number;
    discountTotal: number;
    exchangeValue: number;
    finalOnRoadPrice: number;
  };
  
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  managerComments?: string;
  history: Array<{
    changedBy: mongoose.Types.ObjectId;
    at: Date;
    changes: Record<string, { from: any; to: any }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationSchema: Schema = new Schema({
  quotationNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesperson: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  location: {
    showroom: String,
    placeOfSupply: String,
    state: String
  },
  
  enquiryDetails: {
    source: String,
    gstCategory: String,
    relation: String,
    relationName: String
  },
  
  car: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
  selectedColor: { type: String, required: true },
  
  accessories: [{ type: Schema.Types.ObjectId, ref: 'Accessory' }],
  
  charges: {
    registration: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    handling: { type: Number, default: 0 },
    fastag: { type: Number, default: 0 },
    extendedWarranty: { type: Number, default: 0 },
  },
  
  discounts: {
    dealer: { type: Number, default: 0 },
    exchangeBonus: { type: Number, default: 0 },
    corporate: { type: Number, default: 0 },
    festival: { type: Number, default: 0 },
    managerSpecial: { type: Number, default: 0 },
  },
  
  exchangeVehicle: {
    brand: String,
    model: String,
    year: Number,
    condition: String,
    expectedValue: { type: Number, default: 0 }
  },
  
  finance: {
    type: { type: String, enum: ['Cash', 'Finance', 'Lease'] },
    agentType: { type: String, enum: ['DSA', 'DST', 'Inhouse'] },
    financer: String,
    downPayment: Number,
    loanAmount: Number,
    interestRate: Number,
    tenureYears: Number
  },
  
  pricing: {
    exShowroom: { type: Number, required: true },
    accessoriesTotal: { type: Number, required: true },
    chargesTotal: { type: Number, required: true },
    subTotal: { type: Number, required: true },
    gstTotal: { type: Number, required: true },
    discountTotal: { type: Number, required: true },
    exchangeValue: { type: Number, default: 0 },
    finalOnRoadPrice: { type: Number, required: true }
  },
  
  status: { type: String, enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected'], default: 'Draft' },
  managerComments: String,
  history: [{
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    changes: Schema.Types.Mixed
  }]
}, { timestamps: true });

export default mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);
