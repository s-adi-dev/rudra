import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UserState {
  selectedUserId: string | null;
  currentPage: number;
  itemsPerPage: number;
  selectedRole: string | null;
  searchQuery: string;
  includeDeleted: boolean;
  setSelectedUserId: (userId: string | null) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (limit: number) => void;
  setSelectedRole: (role: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIncludeDeleted: (include: boolean) => void;
}

const useUserStore = create<UserState>()(
  devtools(
    (set) => ({
      selectedUserId: null,
      currentPage: 1,
      itemsPerPage: 5,
      selectedRole: null,
      searchQuery: "",
      includeDeleted: false,
      setSelectedUserId: (userId) => set({ selectedUserId: userId }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setItemsPerPage: (limit) => set({ itemsPerPage: limit }),
      setSelectedRole: (role) => set({ selectedRole: role }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setIncludeDeleted: (include) => set({ includeDeleted: include }),
    }),
    {
      name: "user-store",
    },
  ),
);

export default useUserStore;
