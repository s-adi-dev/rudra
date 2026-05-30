import { CenterWrapper } from "@/components/custom ui/center-page";
import ErrorCard from "@/components/custom ui/error-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useDebounce } from "@/hooks/use-debounce";
import { UserTable } from "@/pages/panel/users/user-table";
import { useAuth } from "@/store/auth";
import useUserStore, { useUsers } from "@/store/users";
import { CustomAxiosError } from "@/utils/types/axios";
import { useCallback, useEffect, useState } from "react";
import { UserFooter } from "./user-footer";
import { UserHeader } from "./user-header";
import { UserSkeleton } from "./user-skeleton";

export const UserList = () => {
  const { setBreadcrumbs } = useBreadcrumb();
  const { logout: handleLogout } = useAuth(false);
  const {
    currentPage,
    itemsPerPage,
    searchQuery,
    setSearchQuery,
    setCurrentPage,
    selectedRole,
    setSelectedRole,
    includeDeleted,
    setIncludeDeleted,
  } = useUserStore();

  // Local state for input value
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isFiltered, setIsFiltered] = useState(false);

  // Debounced function to update store and trigger API call
  const debouncedSetSearch = useDebounce((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, 600);

  // Handle input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value); // Update local state immediately
      debouncedSetSearch(value); // Debounce the store update
      setIsFiltered(true);
      if (value === "" && !selectedRole && !includeDeleted)
        setIsFiltered(false);
    },
    [debouncedSetSearch, selectedRole, includeDeleted],
  );

  const handleRoleChange = useCallback(
    (value: string) => {
      setSelectedRole(value);
      setCurrentPage(1);
      setIsFiltered(true);
    },
    [setSelectedRole, setCurrentPage, setIsFiltered],
  );

  const handleToggleDeleted = useCallback(() => {
    setIncludeDeleted(!includeDeleted);
    setCurrentPage(1);
    setIsFiltered(true);
  }, [includeDeleted, setIncludeDeleted, setCurrentPage]);

  const handleClearFilter = useCallback(() => {
    setSearchTerm("");
    debouncedSetSearch("");
    setSelectedRole(null);
    setIncludeDeleted(false);
    setIsFiltered(false);
  }, [
    setSearchTerm,
    debouncedSetSearch,
    setSelectedRole,
    setIncludeDeleted,
    setIsFiltered,
  ]);

  const { data, isLoading, error } = useUsers({
    page: currentPage,
    limit: itemsPerPage,
    role: selectedRole || undefined,
    search: searchQuery, // This uses the debounced value from store
    includeDeleted: includeDeleted,
  });

  const paginationData = data && {
    lastIndex: currentPage * itemsPerPage,
    firstIndex: currentPage * itemsPerPage - itemsPerPage,
    totalUsers: data.totalUsers,
  };

  const navigation = {
    currentPage: data?.currentPage || 0,
    totalPages: data?.totalPages || 0,
    onPageChange: (nthPageNumber: number) => setCurrentPage(nthPageNumber),
  };

  const filter = {
    searchTerm: searchTerm,
    onSearchChange: handleSearchChange,
    selectedRole: selectedRole || "",
    onRoleChange: handleRoleChange,
    isFiltered: isFiltered,
    onClearFilter: handleClearFilter,
    includeDeleted: includeDeleted,
    onToggleDeleted: handleToggleDeleted,
  };

  useEffect(() => {
    setBreadcrumbs([{ label: "Users" }]);
  }, [setBreadcrumbs]);

  if (isLoading) {
    return <UserSkeleton />;
  }

  if (error) {
    const { response, message } = error as CustomAxiosError;
    let errMsg = response?.data.error ?? message;

    if (errMsg === "Access denied. No token provided")
      errMsg = "Access denied. No token provided please login again";

    if (errMsg === "Network Error")
      errMsg =
        "Connection issue detected. Please check your internet or try again later.";

    return (
      <CenterWrapper className="px-2 gap-2 text-center">
        <ErrorCard
          title="Error occured"
          description={errMsg}
          btnTitle="Go to Login"
          onAction={handleLogout}
        />
      </CenterWrapper>
    );
  }

  return (
    <Card className="w-[90svw] lg:w-full">
      <CardHeader>
        <CardTitle>User List</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <UserHeader
          filter={filter}
          pagination={navigation}
          recordInfo={paginationData || {}}
        />
        <UserTable
          userList={data?.users || []}
          firstIndex={paginationData?.firstIndex ?? 0}
        />
        <UserFooter
          currClients={data?.users.length || 0}
          totalClients={data?.totalUsers || 0}
        />
      </CardContent>
    </Card>
  );
};

export default UserList;
