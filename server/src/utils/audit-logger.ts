import AuditLog from "../models/audit";

export interface LogDownloadParams {
  userId: string;
  username: string;
  reportType: string;
  action: "download" | "preview";
  description: string;
  roles?: string[];
}

/**
 * Logs report download or preview actions to audit trail
 * @param params - Download/preview log parameters
 */
export async function logReportAction(params: LogDownloadParams) {
  try {
    const { userId, username, reportType, action, description, roles } = params;

    const newLog = new AuditLog({
      event: {
        action,
        changes: {
          reportType,
          timestamp: new Date(),
        },
      },
      actor: {
        userId,
        username,
        roles: roles || [],
      },
      source: "Report",
      description,
      timestamp: new Date(),
    });

    await newLog.save();
    console.log(`Audit log created: ${action} - ${reportType} by ${username}`);
    return newLog;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw error - logging shouldn't break the main operation
    return null;
  }
}
