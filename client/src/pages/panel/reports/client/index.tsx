import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/hooks/use-role";
import { useClients, useClientStore } from "@/store/client";
import { useClientPartners } from "@/store/client-partner";
import { requirementOptions } from "@/store/data/options";
import { useInventory } from "@/store/inventory";
import { useUsersSummary } from "@/store/users";
import { logReportAction } from "@/utils/report-audit-logger";
import type { userType } from "@/store/users/types";
import type { CombinedRoleType } from "@/store/role/types";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { ClientFilter } from "../../client/client-filter";
import { exportClientToExcel } from "./excel";

interface ClientReportProps {
  user: userType | null;
  combinedRole: CombinedRoleType | null;
}

export function ClientReport({ user, combinedRole }: ClientReportProps) {
  // Fetch data from stores
  const { useClientsList } = useClients();
  const { filters, resetFilters } = useClientStore();
  const { data, isFetching } = useClientsList({
    ...filters,
    page: 1,
    limit: 100000,
    search: "",
  });
  const { data: managers } = useUsersSummary();
  const { useReferenceWithDelete } = useClientPartners();
  const { data: refData } = useReferenceWithDelete();

  const { useProjectsStructure } = useInventory();
  const { data: projectsData } = useProjectsStructure();
  const projectOptions =
    projectsData?.data?.map((p) => ({ label: p.name, value: p.name! })) || [];

  const canViewContactInfo =
    hasPermission(combinedRole, "Clients", "view-client-contact-info") ||
    hasPermission(combinedRole, "Clients", "view-contact-info");

  const countAppliedFilters = (filterObj: typeof filters) => {
    // List of keys to exclude
    const excludedKeys = ["managers", "page", "search", "limit"];

    const count = Object.entries(filterObj)
      .filter(([key]) => !excludedKeys.includes(key)) // Remove unwanted fields
      .reduce((total, [key, value]) => {
        // Handle budget logic
        if (key === "maxBudget" && !filterObj.minBudget) return total;
        if (key === "minBudget" && filterObj.maxBudget) return total + 1;
        return value ? total + 1 : total;
      }, 0);

    return count;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => resetFilters(), []);

  // Prepare the lists for export
  const lists = {
    requirementList: requirementOptions,
    projectList: projectOptions,
    managerList: managers ?? [],
    referenceList: refData?.references ?? [],
  };

  // Handle export action
  const handleDownload = async () => {
    if (data?.clients && data.clients.length > 0 && user) {
      // Log the download action
      await logReportAction(
        user._id,
        user.username || "",
        {
          action: "download",
          reportType: "Client Report",
          description: `Downloaded Client Report with ${data.clients.length} records`,
        },
        combinedRole?.roles || [],
      );

      exportClientToExcel(data.clients, lists, canViewContactInfo);
    } else {
      console.log("No client data available");
    }
  };

  // Check if download should be disabled
  const isDownloadDisabled =
    !data?.clients || data.clients.length === 0 || isFetching;

  return (
    <Card className="w-72 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FileSpreadsheet className="text-gray-500" />
          <span className="text-sm text-gray-500 uppercase">XLSX</span>
        </div>
        <CardTitle className="mt-4">Client Report</CardTitle>
        <CardDescription>Detailed client list in a spreadsheet</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {isFetching && (
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Updating data...
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto flex-col gap-3">
        <ClientFilter>
          <Tooltip content="More filter options">
            <Button
              className="w-full flex-shrink-0 relative"
              variant="outline"
              disabled={!data?.clients || data.clients.length === 0}
            >
              {countAppliedFilters(filters) > 0 && (
                <Badge className="bg-red-500 text-white absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                  {countAppliedFilters(filters)}
                </Badge>
              )}
              Apply Filter
            </Button>
          </Tooltip>
        </ClientFilter>

        <Button
          className="w-full"
          variant="default"
          onClick={handleDownload}
          disabled={isDownloadDisabled}
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
