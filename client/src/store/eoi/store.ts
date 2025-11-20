import { create } from "zustand";

// Types
interface EoiFilters {
  page: number;
  limit: number;
  search: string;
  applicant?: string;
  manager?: string;
  status?: string;
  config?: "1BHK" | "2BHK" | "3BHK";
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

interface EoiStore {
  // Filter state
  filters: EoiFilters;
  setFilters: (filters: Partial<EoiFilters>) => void;
  resetFilters: () => void;

  // Selected EOI state
  selectedEoiId: string | null;
  setSelectedEoiId: (id: string | null) => void;
}

// Create EOI store
export const useEoiStore = create<EoiStore>((set) => ({
  // Initial filter state
  filters: {
    page: 1,
    limit: 10,
    search: "",
    sortBy: "eoiNo",
    sortOrder: "asc",
  },

  // Filter actions
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () =>
    set({
      filters: {
        page: 1,
        limit: 10,
        search: "",
        sortBy: "eoiNo",
        sortOrder: "asc",
      },
    }),

  // Selected EOI state
  selectedEoiId: null,
  setSelectedEoiId: (id) =>
    set({
      selectedEoiId: id,
    }),
}));
