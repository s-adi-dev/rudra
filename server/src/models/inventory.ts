import mongoose, { Document, Schema, Types } from "mongoose";

// Types
export interface UnitType extends Document {
  _id: Types.ObjectId;
  floorId: Types.ObjectId;
  unitNumber: string;
  area: number;
  configuration: string;
  unitSpan: number;
  status: string;
  reservedByOrReason?: string;
  referenceId?: Types.ObjectId;
}

export interface FloorType extends Document {
  _id: Types.ObjectId;
  wingId?: Types.ObjectId;
  projectId: Types.ObjectId;
  type: "residential" | "commercial";
  displayNumber: number;
  showArea: boolean;
  units: Types.ObjectId[];
}

export interface WingType extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  commercialFloors?: Types.ObjectId[];
  floors: Types.ObjectId[];
  unitsPerFloor: number;
  headerFloorIndex: number;
}

export interface ProjectType extends Document {
  _id: Types.ObjectId;
  name: string;
  by: string;
  location: string;
  email?: string;
  description?: string;
  startDate: Date;
  completionDate?: Date;
  status: "planning" | "under-construction" | "completed";
  commercialUnitPlacement: "projectLevel" | "wingLevel";
  wings: Types.ObjectId[];
  projectStage: number;
  bank?: Types.ObjectId;
  commercialFloors?: Types.ObjectId[];
}

// Schemas
const UnitSchema = new Schema<UnitType>(
  {
    floorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Floor",
    },
    unitNumber: {
      type: String,
      required: true,
      index: true,
    },
    area: {
      type: Number,
      required: true,
      min: 0,
    },
    configuration: {
      type: String,
      required: true,
    },
    unitSpan: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      index: true,
    },
    reservedByOrReason: {
      type: String,
    },
    referenceId: {
      type: String,
    },
  },
  { timestamps: true },
);

const FloorSchema = new Schema<FloorType>(
  {
    wingId: {
      type: Schema.Types.ObjectId,
      ref: "Wing",
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    type: {
      type: String,
      enum: ["residential", "commercial"],
      required: true,
    },
    displayNumber: {
      type: Number,
      required: true,
    },
    showArea: {
      type: Boolean,
      default: true,
    },
    units: [
      {
        type: Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],
  },
  { timestamps: true },
);

const WingSchema = new Schema<WingType>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    commercialFloors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Floor",
      },
    ],
    floors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Floor",
      },
    ],
    unitsPerFloor: {
      type: Number,
      required: true,
      min: 0,
    },
    headerFloorIndex: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

const ProjectSchema = new Schema<ProjectType>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    by: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    description: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
    },
    completionDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["planning", "under-construction", "completed"],
      required: true,
    },
    commercialUnitPlacement: {
      type: String,
      enum: ["projectLevel", "wingLevel"],
      required: true,
    },
    projectStage: {
      type: Number,
      default: 0,
    },
    wings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Wing",
      },
    ],
    commercialFloors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Floor",
      },
    ],
    bank: {
      type: Schema.Types.ObjectId,
      ref: "Bank",
    },
  },
  { timestamps: true },
);

// Create models
export const Unit = mongoose.model<UnitType>("Unit", UnitSchema);
export const Floor = mongoose.model<FloorType>("Floor", FloorSchema);
export const Wing = mongoose.model<WingType>("Wing", WingSchema);
export const Project = mongoose.model<ProjectType>("Project", ProjectSchema);
