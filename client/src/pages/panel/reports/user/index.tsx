import { MultiSelect } from "@/components/custom ui/multi-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRoles } from "@/store/role";
import { useUsers } from "@/store/users";
import { logReportAction } from "@/utils/report-audit-logger";
import type { userType } from "@/store/users/types";
import type { CombinedRoleType } from "@/store/role/types";
import { Download, FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";
import { exportUsersToExcel } from "./excel";

interface UserReportProps {
  user: userType | null;
  combinedRole: CombinedRoleType | null;
}

export function UserReport({ user, combinedRole }: UserReportProps) {
  // Fetch data from stores
  const { rolesArray: roles } = useRoles();
  const { data, isLoading } = useUsers({
    page: 1,
    limit: 10000,
    role: undefined,
    search: "", // This uses the debounced value from store
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const roleOptions = useMemo(
    () =>
      roles.data?.map((role) => ({
        label: role.name,
        value: role.name,
      })) || [],
    [roles.data],
  );

  // Filter users based on selected roles
  const filteredUsers = useMemo(() => {
    if (!data?.users || data.users.length === 0) return [];
    if (selectedRoles.length === 0) return data.users;

    return data.users.filter((user) => {
      if (!user.roles || user.roles.length === 0) return false;
      return user.roles.some((role) => selectedRoles.includes(role));
    });
  }, [data?.users, selectedRoles]);

  // Handle export action
  const handleDownload = async () => {
    if (filteredUsers.length > 0 && user) {
      // Log the download action
      await logReportAction(
        user._id,
        user.username || "",
        {
          action: "download",
          reportType: "User Report",
          description: `Downloaded User Report with ${filteredUsers.length} records`,
        },
        combinedRole?.roles || [],
      );

      exportUsersToExcel(filteredUsers);
    } else {
      console.log("No user data available for export");
    }
  };

  return (
    <Card className="w-72 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FileSpreadsheet className="text-gray-500" />
          <span className="text-sm text-gray-500 uppercase">XLSX</span>
        </div>
        <CardTitle className="mt-4">User Report</CardTitle>
        <CardDescription>Detailed user list in a spreadsheet</CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto flex-col gap-2">
        <p className="text-sm text-gray-500 w-full mb-1">Filter by roles:</p>
        <MultiSelect
          options={roleOptions}
          defaultValue={selectedRoles}
          onValueChange={(e) => {
            setSelectedRoles(e);
          }}
          placeholder="Select roles"
          className="w-full"
        />
        <Button
          className="w-full mt-1"
          variant="default"
          onClick={handleDownload}
          disabled={isLoading || filteredUsers.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {selectedRoles.length > 0
            ? "Download Report"
            : "Download Full Report"}
        </Button>
      </CardFooter>
    </Card>
  );
}
