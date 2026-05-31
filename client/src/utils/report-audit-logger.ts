import newRequest from "@/utils/func/request";

export interface LogReportActionParams {
  action: "download" | "preview";
  reportType: string;
  description: string;
}

/**
 * Logs report download or preview action to the server
 * @param userId - User ID
 * @param username - Username
 * @param params - Action parameters
 * @param roles - User roles
 */
export async function logReportAction(
  userId: string,
  username: string,
  params: LogReportActionParams,
  roles?: string[],
) {
  try {
    const response = await newRequest.post("/audit/logs", {
      event: {
        action: params.action,
        changes: {
          reportType: params.reportType,
          timestamp: new Date(),
        },
      },
      actor: {
        userId,
        username,
        roles: roles || [],
      },
      source: "Report",
      description: params.description,
    });

    console.log(
      `Report action logged: ${params.action} - ${params.reportType}`,
    );
    return response.data;
  } catch (error) {
    console.error("Failed to log report action:", error);
    // Don't throw error - logging shouldn't break the main operation
    return null;
  }
}
