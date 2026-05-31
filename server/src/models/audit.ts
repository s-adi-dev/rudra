import mongoose, { Schema, Document } from "mongoose";

export interface AuditLog extends Document {
  event: {
    action: "create" | "update" | "delete" | "locked" | "unlocked" | "download" | "preview";
    changes: any;
  };
  actor: {
    userId: string;
    username: string;
    roles?: string[];
  };
  source: string; // Entity affected (e.g., "Users", "Task", "Report")
  description: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<AuditLog>(
  {
    event: {
      action: {
        type: String,
        required: true,
        enum: ["create", "update", "delete", "locked", "unlocked", "download", "preview"],
      },

      changes: { type: Schema.Types.Mixed },
    },
    actor: {
      userId: { type: String, required: true, index: true },
      username: { type: String, required: true },
      roles: [{ type: String }],
    },
    source: {
      type: String,
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We're using our own timestamp field
    versionKey: false, // Remove __v field
    collection: "auditLogs",
  },
);

// Compound indexes for common query patterns
AuditLogSchema.index({ "actor.userId": 1, timestamp: -1 });
AuditLogSchema.index({ source: 1, timestamp: -1 });
AuditLogSchema.index({ "event.action": 1, timestamp: -1 });

export default mongoose.model<AuditLog>("AuditLog", AuditLogSchema);
