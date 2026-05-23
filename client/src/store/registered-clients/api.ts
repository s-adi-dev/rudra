// src/api/registeredClientsApi.ts
import newRequest from "@/utils/func/request";

// Types for API responses
export interface RegisteredClientData {
  clientId: string;
  date: string;
  registrationDate?: string | null;
  name: string;
  unit: string;
  wing?: string;
  agreementValue: number;
  receivedAmount: number;
}

export interface GetRegisteredClientsByProjectResponse {
  success: boolean;
  project: string;
  totalClients: number;
  totalAgreementValue: number;
  totalReceivedAmount: number;
  data: RegisteredClientData[];
}

export interface ProjectSummary {
  project: string;
  totalClients: number;
  totalAgreementValue: number;
  totalReceivedAmount: number;
  totalPendingAmount: number;
}

export interface GetAllProjectsSummaryResponse {
  success: boolean;
  totalProjects: number;
  grandTotals: {
    totalClients: number;
    totalAgreementValue: number;
    totalReceivedAmount: number;
    totalPendingAmount: number;
  };
  data: ProjectSummary[];
}

export interface RegisteredClientsFilters {
  includeStatuses?: string; // comma-separated string of statuses
}

// Registered Clients API methods
export const registeredClientsApi = {
  // Get registered clients by project
  getRegisteredClientsByProject: async (
    project: string,
    filters: RegisteredClientsFilters = {},
  ) => {
    const { includeStatuses } = filters;

    const queryParams = new URLSearchParams();
    if (includeStatuses) queryParams.append("includeStatuses", includeStatuses);

    const url = `/registered-clients/project/${encodeURIComponent(project)}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response =
      await newRequest.get<GetRegisteredClientsByProjectResponse>(url);
    return response.data;
  },

  // Get summary for all projects
  getAllProjectsSummary: async (filters: RegisteredClientsFilters = {}) => {
    const { includeStatuses } = filters;

    const queryParams = new URLSearchParams();
    if (includeStatuses) queryParams.append("includeStatuses", includeStatuses);

    const url = `/registered-clients/summary${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await newRequest.get<GetAllProjectsSummaryResponse>(url);
    return response.data;
  },
};
