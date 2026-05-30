import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hasPermission } from "@/hooks/use-role.ts";
import { useAuth } from "@/store/auth";
import { RoleArrayType, useRoles } from "@/store/role";
import { toProperCase } from "@/utils/func/strUtils";
import { FilterX, Eye, EyeOff } from "lucide-react";
import { UserAddButton } from "./user-add-button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface FilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRole: string;
  onRoleChange: (value: string) => void;
  isFiltered: boolean;
  onClearFilter: () => void;
  includeDeleted?: boolean;
  onToggleDeleted?: () => void;
}

interface RecordInfoProps {
  firstIndex?: number;
  lastIndex?: number;
  totalUsers?: number;
}

interface UserHeaderProp {
  filter: FilterProps;
  pagination: PaginationProps;
  recordInfo: RecordInfoProps;
}

export const UserHeader = ({ filter, pagination }: UserHeaderProp) => {
  const { combinedRole } = useAuth(false);
  const showDeletedToggle = hasPermission(
    combinedRole,
    "Users",
    "view-deleted-users",
  );

  return (
    <div className="w-full flex flex-wrap gap-3 items-center justify-around md:justify-between mb-3">
      <div className="flex gap-3 sm:gap-2 justify-around flex-wrap sm:flex-nowrap sm:justify-start">
        {/* Search input */}
        <Input
          type="text"
          value={filter.searchTerm}
          onChange={(e) => filter.onSearchChange(e.target.value)}
          placeholder="Search users..."
          className="sm:max-w-64"
        />

        {/* Role filter */}
        <RoleSelect filter={filter} />

        <span className="flex gap-2">
          {/* Show deleted users toggle */}
          {showDeletedToggle && (
            <Tooltip
              content={
                filter.includeDeleted
                  ? "Hide deleted users"
                  : "Show deleted users"
              }
            >
              <Button
                className="flex-shrink-0"
                onClick={filter.onToggleDeleted}
                variant={filter.includeDeleted ? "default" : "outline"}
                size="icon"
                aria-label="Toggle deleted users"
              >
                {filter.includeDeleted ? (
                  <Eye size={20} />
                ) : (
                  <EyeOff size={20} />
                )}
              </Button>
            </Tooltip>
          )}

          {/* Clear filters button */}
          {filter.isFiltered && (
            <Tooltip content="Clear filter">
              <Button
                className="flex-shrink-0"
                onClick={filter.onClearFilter}
                variant="outline"
                size="icon"
                aria-label="Clear filters"
              >
                <FilterX size={20} />
              </Button>
            </Tooltip>
          )}

          <UserAddButtonWrapper />
        </span>
      </div>

      {/* Pagination controls */}
      {pagination && (
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage <= 1}
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
          >
            Previous
          </Button>

          <span className="px-2 text-sm whitespace-nowrap">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

const RoleSelect = ({ filter }: { filter: FilterProps }) => {
  const { rolesArray: roles } = useRoles();

  return (
    <Select onValueChange={filter.onRoleChange} value={filter.selectedRole}>
      <SelectTrigger className="w-44 sm:w-[120px]">
        <SelectValue placeholder="Roles" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Roles</SelectLabel>
          {roles.data &&
            roles.data.map((role: RoleArrayType) => {
              return (
                <SelectItem value={role.name} key={role._id}>
                  {toProperCase(role.name)}
                </SelectItem>
              );
            })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const UserAddButtonWrapper = () => {
  const { combinedRole } = useAuth(false);
  const showUserAddButton = hasPermission(combinedRole, "Users", "create-user");

  if (!showUserAddButton) return null;

  return (
    <div className="flex-shrink-0">
      <UserAddButton />
    </div>
  );
};
