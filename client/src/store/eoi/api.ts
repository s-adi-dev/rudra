import newRequest from "@/utils/func/request";
import { EoiType } from "./types";

// Types for API responses
export interface GetEoisResponse {
  success: boolean;
  data: EoiType[];
  currentPage: number;
  limitNumber: number;
  totalPages: number;
  totalEois: number;
}

interface EoiResponse {
  success: boolean;
  data: EoiType;
  message?: string;
}

interface CreateEoiResponse {
  success: boolean;
  data: EoiType;
  message: string;
}

interface EoiFilters {
  page?: number;
  limit?: number;
  search?: string;
  applicant?: string;
  manager?: string;
  config?: string;
  status?: string;
  eoiNo?: number;
  contact?: number;
  pan?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// EOI API methods
export const eoiApi = {
  // Get all EOIs with optional filters
  getEois: async (filters: EoiFilters = {}) => {
    const {
      page = 1,
      limit = 10,
      search,
      applicant,
      manager,
      config,
      status,
      eoiNo,
      contact,
      pan,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy,
      sortOrder,
    } = filters;

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());

    if (search) queryParams.append("search", search);
    if (applicant) queryParams.append("applicant", applicant);
    if (manager) queryParams.append("manager", manager);
    if (config) queryParams.append("config", config);
    if (status) queryParams.append("status", status);
    if (eoiNo) queryParams.append("eoiNo", eoiNo.toString());
    if (contact) queryParams.append("contact", contact.toString());
    if (pan) queryParams.append("pan", pan);
    if (startDate) queryParams.append("startDate", startDate.toISOString());
    if (endDate) queryParams.append("endDate", endDate.toISOString());
    if (minAmount) queryParams.append("minAmount", minAmount.toString());
    if (maxAmount) queryParams.append("maxAmount", maxAmount.toString());
    if (sortBy) queryParams.append("sortBy", sortBy);
    if (sortOrder) queryParams.append("sortOrder", sortOrder);

    const response = await newRequest.get<GetEoisResponse>(
      `/eoi?${queryParams.toString()}`,
    );
    return response.data;
  },

  // Get a single EOI by ID
  getEoi: async (id: string) => {
    const response = await newRequest.get<EoiResponse>(`/eoi/${id}`);
    return response.data;
  },

  // Create new EOI
  createEoi: async (eoiData: Partial<EoiType>) => {
    const response = await newRequest.post<CreateEoiResponse>("/eoi", eoiData);
    return response.data;
  },

  // Update EOI by ID
  updateEoi: async (id: string, updateData: Partial<EoiType>) => {
    const response = await newRequest.put<EoiResponse>(
      `/eoi/${id}`,
      updateData,
    );
    return response.data;
  },

  // Delete EOI by ID
  deleteEoi: async (id: string) => {
    const response = await newRequest.delete<EoiResponse>(`/eoi/${id}`);
    return response.data;
  },
};
