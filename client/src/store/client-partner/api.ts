// src/api/clientPartnerApi.ts
import newRequest from "@/utils/func/request";
import { ClientPartnerType, RefernceListType } from "./types";

// Types for API responses
export interface GetClientPartnersResponse {
  totalClientPartners: number;
  totalPages: number;
  currentPage: number;
  limitNumber: number;
  clientPartners: ClientPartnerType[];
}

export interface GetRefernceResponse {
  references: RefernceListType[];
}

export interface ClientPartnerResponse {
  message: string;
  cp: ClientPartnerType;
}

export interface DeleteClientPartnerResponse {
  message: string;
  cpId: string;
}

export interface ClientPartnerFilters {
  page?: number;
  limit?: number;
  search?: string;
  createdBy?: string;
}

// Employee data types
export interface EmployeeData {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNo: string;
  altNo?: string;
  position?: string;
  commissionPercentage?: number;
}

// Client Partner API methods
export const clientPartnerApi = {
  // Get all client partners with optional filters
  getAllClientPartners: async (filters: ClientPartnerFilters = {}) => {
    const { page = 1, limit = 10, search, createdBy } = filters;

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (search) queryParams.append("search", search);
    if (createdBy) queryParams.append("createdBy", createdBy);

    const response = await newRequest.get<GetClientPartnersResponse>(
      `/client-partner?${queryParams.toString()}`,
    );
    return response.data;
  },

  // Get a single client partner by ID
  getClientPartner: async (id: string) => {
    const response = await newRequest.get<ClientPartnerType>(
      `/client-partner/${id}`,
    );
    return response.data;
  },

  // Get a reference list of client partner
  getReference: async (includeDeleted?: boolean) => {
    const queryParams = new URLSearchParams();
    if (includeDeleted === true) queryParams.append("includeDeleted", "true");
    const response = await newRequest.get<GetRefernceResponse>(
      `/client-partner/reference?${queryParams.toString()}`,
    );
    return response.data;
  },

  // Create a new client partner
  createClientPartner: async (clientPartnerData: {
    cpId: string;
    name: string;
    email: string;
    phoneNo: string;
    altNo?: string;
    address?: string;
    website?: string;
    logo?: string;
    description?: string;
    employees?: EmployeeData[];
  }) => {
    const response = await newRequest.post<ClientPartnerResponse>(
      "/client-partner",
      clientPartnerData,
    );
    return response.data;
  },

  // Update an existing client partner
  updateClientPartner: async (
    id: string,
    clientPartnerData: Partial<{
      name: string;
      email: string;
      phoneNo: string;
      address: string;
      companyWebsite: string;
      notes: string;
    }>,
  ) => {
    const response = await newRequest.put<ClientPartnerResponse>(
      `/client-partner/${id}`,
      clientPartnerData,
    );
    return response.data;
  },

  // Delete a client partner
  deleteClientPartner: async (id: string) => {
    const response = await newRequest.delete<DeleteClientPartnerResponse>(
      `/client-partner/${id}`,
    );
    return response.data;
  },

  // Add employee to client partner
  addEmployee: async (id: string, employeeData: EmployeeData) => {
    const response = await newRequest.post<ClientPartnerResponse>(
      `/client-partner/${id}/employees`,
      employeeData,
    );
    return response.data;
  },

  // Update employee
  updateEmployee: async (
    id: string,
    employeeId: string,
    employeeData: Partial<EmployeeData>,
  ) => {
    const response = await newRequest.put<ClientPartnerResponse>(
      `/client-partner/${id}/employees/${employeeId}`,
      employeeData,
    );
    return response.data;
  },

  // Remove employee from client partner
  removeEmployee: async (id: string, employeeId: string) => {
    const response = await newRequest.delete<ClientPartnerResponse>(
      `/client-partner/${id}/employees/${employeeId}`,
    );
    return response.data;
  },

  // CP Management endpoints

  // Merge two client partners (transfer all employees from source to target)
  mergeClientPartners: async (sourceId: string, targetId: string) => {
    const response = await newRequest.post<{
      message: string;
      transferredEmployees: Array<{ _id: string; name: string }>;
      transferCount: number;
      targetClientPartner: string;
    }>("/cp-management/merge-cp", {
      sourceId,
      targetId,
    });
    return response.data;
  },

  // Merge two CP employees (transfer all referred clients from source to target)
  mergeEmployees: async (sourceId: string, targetId: string) => {
    const response = await newRequest.post<{
      message: string;
      transferredReferrals: number;
      targetEmployee: { _id: string; name: string };
      sourceEmployee: { _id: string; name: string };
    }>("/cp-management/merge-employees", {
      sourceId,
      targetId,
    });
    return response.data;
  },

  // Transfer a single employee to a different client partner
  transferEmployee: async (
    employeeId: string,
    targetClientPartnerId: string,
  ) => {
    const response = await newRequest.post<{
      message: string;
      employee: { _id: string; name: string; position: string };
      sourceClientPartner: string;
      targetClientPartner: string;
      transferredReferrals: number;
    }>("/cp-management/transfer-employee", {
      employeeId,
      targetClientPartnerId,
    });
    return response.data;
  },

  // Get potential merge candidates for client partners
  getClientPartnerMergeCandidates: async (
    cpId: string,
    threshold: number = 0.8,
  ) => {
    const response = await newRequest.get<{
      currentCP: { _id: string; name: string; employeeCount: number };
      mergeCandidates: Array<{
        _id: string;
        name: string;
        email?: string;
        phoneNo?: string;
        employeeCount: number;
        similarityScore: number;
        reasons: string[];
      }>;
      candidateCount: number;
    }>(`/cp-management/cp-merge-candidates/${cpId}?threshold=${threshold}`);
    return response.data;
  },

  // Get potential merge candidates for employees
  getEmployeeMergeCandidates: async (
    employeeId: string,
    threshold: number = 0.7,
  ) => {
    const response = await newRequest.get<{
      currentEmployee: {
        _id: string;
        name: string;
        referredClientCount: number;
      };
      mergeCandidates: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phoneNo?: string;
        position: string;
        referredClientCount: number;
        similarityScore: number;
        reasons: string[];
      }>;
      candidateCount: number;
    }>(
      `/cp-management/employee-merge-candidates/${employeeId}?threshold=${threshold}`,
    );
    return response.data;
  },
};
