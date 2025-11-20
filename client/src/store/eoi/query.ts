import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eoiApi } from "./api";
import { EoiType } from "./types";

// Central hook for EOI-related queries and mutations
export const useEois = () => {
  const queryClient = useQueryClient();

  // Get EOIs with filters
  const useEoisList = (filters = { page: 1, limit: 10, search: "" }) =>
    useQuery({
      queryKey: ["eois", filters],
      queryFn: () => eoiApi.getEois(filters),
      staleTime: 1 * 60 * 1000, // 1 minute
      placeholderData: (previousData) => previousData,
    });

  // Get a single EOI
  const useEoiDetails = (id: string) =>
    useQuery({
      queryKey: ["eoi", id],
      queryFn: () => eoiApi.getEoi(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

  // Create EOI mutation
  const useCreateEoi = () =>
    useMutation({
      mutationFn: eoiApi.createEoi,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["eois"] });
      },
    });

  // Update EOI mutation
  const useUpdateEoi = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<EoiType> }) =>
        eoiApi.updateEoi(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["eois"] });
        queryClient.invalidateQueries({ queryKey: ["eoi", variables.id] });
      },
    });

  // Delete EOI mutation
  const useDeleteEoi = () =>
    useMutation({
      mutationFn: eoiApi.deleteEoi,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["eois"] });
      },
    });

  return {
    useEoisList,
    useEoiDetails,
    useCreateEoi,
    useUpdateEoi,
    useDeleteEoi,
  };
};
