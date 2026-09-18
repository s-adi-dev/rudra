// src/hooks/useInventory.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi, UnitFilters } from "./api";

// Central hook for inventory-related queries and mutations
export const useInventory = () => {
  const queryClient = useQueryClient();

  // Project Queries
  // ---------------

  // Get projects list with filters
  const useProjectsList = (filters = { page: 1, limit: 10, search: "" }) =>
    useQuery({
      queryKey: ["projects", filters],
      queryFn: () => inventoryApi.getAllProjects(filters),
      staleTime: 1 * 60 * 1000, // 1 minute
      placeholderData: (previousData) => previousData,
    });

  // Get project structure for visualization
  const useProjectsStructure = () =>
    useQuery({
      queryKey: ["projectsStructure"],
      queryFn: () => inventoryApi.getProjectsStructure(),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

  // Get a single project by ID
  const useProjectDetails = (projectId: string) =>
    useQuery({
      queryKey: ["project", projectId],
      queryFn: () => inventoryApi.getProjectById(projectId),
      enabled: !!projectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

  // Get a single project by Name
  const useProjectByName = (projectName: string) =>
    useQuery({
      queryKey: ["project", projectName],
      queryFn: () => inventoryApi.getProjectByName(projectName),
      enabled: !!projectName,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

  // Project Mutations
  // ----------------

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: inventoryApi.createProject,
    onSuccess: () => {
      // Invalidate all project-related queries
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({
      projectId,
      ...data
    }: { projectId: string } & Parameters<
      typeof inventoryApi.updateProject
    >[1]) => inventoryApi.updateProject(projectId, data),
    onSuccess: (_, variables) => {
      // Update the cache for this specific project
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });
      // Invalidate the projects list and structure
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to update project:", error);
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: inventoryApi.deleteProject,
    onSuccess: (_, projectId) => {
      // Remove project details query
      queryClient.removeQueries({ queryKey: ["project", projectId] });
      // Invalidate projects list to refetch latest data
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to delete project:", error);
    },
  });

  // Add floor mutation
  const createFloorMutation = useMutation({
    mutationFn: inventoryApi.createFloor,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to create floor:", error);
    },
  });

  // Unit Queries
  // -----------

  // Get units with filters
  const useUnitsList = (filters: UnitFilters = {}) =>
    useQuery({
      queryKey: ["units", filters],
      queryFn: () => inventoryApi.getAllUnits(filters),
      staleTime: 1 * 60 * 1000, // 1 minute
      placeholderData: (previousData) => previousData,
    });

  // Get a single unit by ID
  const useUnitDetails = (unitId: string) =>
    useQuery({
      queryKey: ["unit", unitId],
      queryFn: () => inventoryApi.getUnitById(unitId),
      enabled: !!unitId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

  // Unit Mutations
  // -------------

  // Create unit mutation
  const createUnitMutation = useMutation({
    mutationFn: inventoryApi.createUnit,
    onSuccess: () => {
      // Invalidate units list and the specific floor this unit belongs to
      queryClient.invalidateQueries({ queryKey: ["units"] });
      // We could also invalidate project details since unit counts might have changed
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to create unit:", error);
    },
  });

  // Update unit mutation
  const updateUnitMutation = useMutation({
    mutationFn: ({
      unitId,
      ...data
    }: { unitId: string } & Parameters<typeof inventoryApi.updateUnit>[1]) =>
      inventoryApi.updateUnit(unitId, data),
    onSuccess: (data) => {
      // Update the unit in the cache
      queryClient.setQueryData(["unit", data.data._id], data);
      // Invalidate units list
      queryClient.invalidateQueries({ queryKey: ["units"] });
      // Project stats might have changed
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to update unit:", error);
    },
  });

  // Update unit status mutation
  const updateUnitStatusMutation = useMutation({
    mutationFn: ({
      unitId,
      ...statusData
    }: { unitId: string } & Parameters<
      typeof inventoryApi.updateUnitStatus
    >[1]) => inventoryApi.updateUnitStatus(unitId, statusData),
    onSuccess: (data) => {
      // Update the unit in the cache
      queryClient.setQueryData(["unit", data.data._id], data);
      // Invalidate units list
      queryClient.invalidateQueries({ queryKey: ["units"] });
      // Project stats might have changed
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to update unit status:", error);
    },
  });

  // Delete unit mutation
  const deleteUnitMutation = useMutation({
    mutationFn: inventoryApi.deleteUnit,
    onSuccess: (_, unitId) => {
      // Remove unit from cache
      queryClient.removeQueries({ queryKey: ["unit", unitId] });
      // Invalidate units list
      queryClient.invalidateQueries({ queryKey: ["units"] });
      // Project stats might have changed
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsStructure"] });
    },
    onError: (error) => {
      console.error("Failed to delete unit:", error);
    },
  });

  return {
    // Project queries
    useProjectsList,
    useProjectsStructure,
    useProjectDetails,
    useProjectByName,

    // Project mutations
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    createFloorMutation,

    // Unit queries
    useUnitsList,
    useUnitDetails,

    // Unit mutations
    createUnitMutation,
    updateUnitMutation,
    updateUnitStatusMutation,
    deleteUnitMutation,
  };
};
