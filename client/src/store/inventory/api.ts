// src/api/inventoryApi.ts
import newRequest from "@/utils/func/request";
import { ProjectType, UnitType } from "./types";

// Types for API responses
export interface GetProjectsResponse {
  success: boolean;
  pagination: {
    totalProjects: number;
    totalPages: number;
    currentPage: number;
    limitNumber: number;
  };
  count: number;
  data: ProjectSummaryType[];
}

export interface ProjectSummaryType {
  _id: string;
  name: string;
  by: string;
  startDate: string;
  status: "planning" | "under-construction" | "completed";
  totalWings: number;
  totalUnits: number;
  totalAvailableUnits: number;
  totalCommercialUnits: number;
  totalAvailableCommercialUnits: number;
}

export interface GetProjectStructureResponse {
  success: boolean;
  data: ProjectType[];
}

export interface GetProjectByIdResponse {
  success: boolean;
  data: ProjectType;
}

export interface ProjectResponse {
  success: boolean;
  data: {
    projectId: string;
    message: string;
  };
}

export interface DeleteProjectResponse {
  success: boolean;
  message: string;
}

export interface GetUnitsResponse {
  success: boolean;
  count: number;
  data: UnitType[];
}

export interface UnitResponse {
  success: boolean;
  data: UnitType;
}

export interface DeleteUnitResponse {
  success: boolean;
  message: string;
}

// Floor data types
export interface UnitPayload {
  unitNumber: string;
  area: number;
  configuration: string;
  unitSpan: number;
  status: string;
  reservedByOrReason?: string;
  referenceId?: string;
}

export interface FloorPayload {
  type: "residential" | "commercial";
  displayNumber: number;
  showArea: boolean;
  units: UnitPayload[];
}

export interface WingPayload {
  name: string;
  floors: FloorPayload[];
  commercialFloors?: FloorPayload[];
  unitsPerFloor: number;
  headerFloorIndex: number;
}

export interface ProjectPayload {
  name: string;
  by: string;
  location: string;
  email?: string;
  description: string;
  startDate: Date | string;
  completionDate?: Date | string;
  status: "planning" | "under-construction" | "completed";
  commercialUnitPlacement: "projectLevel" | "wingLevel";
  wings: WingPayload[];
  commercialFloors?: FloorPayload[];
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UnitFilters {
  floorId?: string;
  status?: string;
  configuration?: string;
}

// Inventory API methods
export const inventoryApi = {
  // Project methods
  // ----------------------------------------------

  // Get all projects with optional filters
  getAllProjects: async (filters: ProjectFilters = {}) => {
    const { page = 1, limit = 10, search } = filters;

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (search) queryParams.append("search", search);

    const response = await newRequest.get<GetProjectsResponse>(
      `/inventory/project?${queryParams.toString()}`,
    );
    return response.data;
  },

  // Get project structure (for visualization)
  getProjectsStructure: async () => {
    const response = await newRequest.get<GetProjectStructureResponse>(
      "/inventory/project-structure",
    );
    return response.data;
  },

  // Get a single project by ID
  getProjectById: async (projectId: string) => {
    const response = await newRequest.get<GetProjectByIdResponse>(
      `/inventory/project/${projectId}`,
    );
    return response.data;
  },

  // Get a single project by ID
  getProjectByName: async (projectName: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append("projectName", projectName);
    const response = await newRequest.get<GetProjectByIdResponse>(
      `/inventory/project/name?${queryParams}`,
    );
    return response.data;
  },

  // Create a new project
  createProject: async (projectData: ProjectPayload) => {
    const response = await newRequest.post<ProjectResponse>(
      "/inventory/project",
      projectData,
    );
    return response.data;
  },

  // Update an existing project
  updateProject: async (
    projectId: string,
    projectData: Partial<{
      name: string;
      by: string;
      location: string;
      email: string;
      description: string;
      startDate: Date | string;
      completionDate?: Date | string;
      projectStage: number;
      bank: {
        holderName: string;
        accountNumber: string;
        name: string;
        branch: string;
        ifscCode: string;
        accountType: "saving" | "current";
      };
      status: "planning" | "under-construction" | "completed";
    }>,
  ) => {
    const response = await newRequest.put<ProjectResponse>(
      `/inventory/project/${projectId}`,
      projectData,
    );
    return response.data;
  },

  // Delete a project
  deleteProject: async (projectId: string) => {
    const response = await newRequest.delete<DeleteProjectResponse>(
      `/inventory/project/${projectId}`,
    );
    return response.data;
  },

  // Unit methods
  // ----------------------------------------------

  // Get all units with optional filtering
  getAllUnits: async (filters: UnitFilters = {}) => {
    const { floorId, status, configuration } = filters;

    const queryParams = new URLSearchParams();
    if (floorId) queryParams.append("floorId", floorId);
    if (status) queryParams.append("status", status);
    if (configuration) queryParams.append("configuration", configuration);

    const response = await newRequest.get<GetUnitsResponse>(
      `/inventory/unit?${queryParams.toString()}`,
    );
    return response.data;
  },

  // Get a single unit by ID
  getUnitById: async (unitId: string) => {
    const response = await newRequest.get<UnitResponse>(
      `/inventory/unit/${unitId}`,
    );
    return response.data;
  },

  // Create a new unit
  createUnit: async (unitData: {
    floorId: string;
    unitNumber: string;
    area: number;
    configuration: string;
    unitSpan: number;
    status: string;
    reservedByOrReason?: string;
    referenceId?: string;
  }) => {
    const response = await newRequest.post<UnitResponse>(
      "/inventory/unit",
      unitData,
    );
    return response.data;
  },

  // Update an existing unit
  updateUnit: async (
    unitId: string,
    unitData: Partial<{
      unitNumber: string;
      area: number;
      configuration: string;
      unitSpan: number;
      status: string;
      reservedByOrReason: string;
      referenceId: string;
    }>,
  ) => {
    const response = await newRequest.put<UnitResponse>(
      `/inventory/unit/${unitId}`,
      unitData,
    );
    return response.data;
  },

  // Update unit status
  updateUnitStatus: async (
    unitId: string,
    statusData: {
      status: string;
      reservedByOrReason?: string;
    },
  ) => {
    const response = await newRequest.patch<UnitResponse>(
      `/inventory/unit/${unitId}/status`,
      statusData,
    );
    return response.data;
  },

  // Delete a unit
  deleteUnit: async (unitId: string) => {
    const response = await newRequest.delete<DeleteUnitResponse>(
      `/inventory/unit/${unitId}`,
    );
    return response.data;
  },
};
