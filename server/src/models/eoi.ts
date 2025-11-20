import mongoose, { Document } from "mongoose";

// Interface for the Application document
export interface EOI extends Document {
  date: Date;
  applicant?: string | null;
  contact?: number | null;
  alt?: number | null;
  status?: string;
  config: string;
  eoiAmt: number;
  eoiNo: number;
  manager: string;
  cp?: string | null;
  pan?: string | null;
  aadhar?: number | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const EoiSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    applicant: {
      type: String,
      default: null,
      trim: true,
    },
    contact: {
      type: Number,
      default: null,
    },
    alt: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      default: "pending",
    },
    config: {
      type: String,
      required: true,
    },
    eoiAmt: {
      type: Number,
      required: true,
    },
    eoiNo: {
      type: Number,
      required: true,
      unique: true,
    },
    manager: {
      type: String,
      required: true,
      trim: true,
    },
    cp: {
      type: String,
      default: null,
      trim: true,
    },
    pan: {
      type: String,
      default: null,
      uppercase: true,
    },
    aadhar: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

// Add indexes
EoiSchema.index({ eoiNo: 1 });
EoiSchema.index({ applicant: 1 });
EoiSchema.index({ manager: 1 });
EoiSchema.index({ manager: 1, date: -1 });
EoiSchema.index({ contact: 1 });
EoiSchema.index({ pan: 1 });
EoiSchema.index({ date: -1 });
EoiSchema.index({ status: 1 });

// Create and export the model
export const EoiModel = mongoose.model<EOI>("EOI", EoiSchema);
