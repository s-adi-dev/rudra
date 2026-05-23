// src/store/BookingStore.ts
import { create } from "zustand";

// Types
export interface BookingFilters {
  page?: number;
  limit?: number;
  search: string;
  status?: string;
  project?: string;
  fromDate?: Date;
  toDate?: Date;
  fromRegDate?: Date;
  toRegDate?: Date;
  plan?: "regular-payment" | "down-payment";
  manager?: string;
}

interface BookingStore {
  // Filter state
  filters: BookingFilters;
  setFilters: (filters: Partial<BookingFilters>) => void;
  resetFilters: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  filters: {
    page: 1,
    limit: 5,
    search: "",
  },

  // Filter actions
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  resetFilters: () =>
    set({
      filters: { page: 1, limit: 5, search: "" },
    }),
}));
