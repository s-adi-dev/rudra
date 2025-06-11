import mongoose from "mongoose";

export interface MemberType {
  username: string;
  target: number;
}

export interface TeamType {
  id: string;
  name: string;
  monthId: string; // e.g. "04-2025"
  leader: MemberType;
  members: MemberType[];
}

export interface MonthlyTargetList {
  monthId: string; // "04-2025"
  teams: TeamType[];
  directMembers: MemberType[]; // those not part of any team
}

const memberSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false, // Since this will be embedded, we don't need separate _id
  },
);

// models/Team.js
const teamSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    monthId: {
      type: String,
      required: true,
      match: /^\d{2}-\d{4}$/, // Format: MM-YYYY
    },
    leader: {
      type: memberSchema,
      required: true,
    },
    members: [memberSchema],
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
teamSchema.index({ monthId: 1 });
teamSchema.index({ "leader.username": 1 });

// models/MonthlyTargetList.js
const monthlyTargetListSchema = new mongoose.Schema(
  {
    monthId: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{2}-\d{4}$/, // Format: MM-YYYY
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    directMembers: [memberSchema],
  },
  {
    timestamps: true,
  },
);

// Create models
export const Member = mongoose.model("Member", memberSchema);
export const Team = mongoose.model("Team", teamSchema);
export const MonthlyTargetList = mongoose.model(
  "MonthlyTargetList",
  monthlyTargetListSchema,
);
