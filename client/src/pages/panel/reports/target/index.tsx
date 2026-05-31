import { DatePickerWithRange } from "@/components/custom ui/date-time-pickers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInventory } from "@/store/inventory";
import { useSalesManagerStats } from "@/store/target/query";
import { useUsersSummary } from "@/store/users";
import { logReportAction } from "@/utils/report-audit-logger";
import type { userType } from "@/store/users/types";
import type { CombinedRoleType } from "@/store/role/types";
import { format } from "date-fns";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { exportSalesManagerToExcel } from "./excel";

interface SalesManagerReportProps {
  user: userType | null;
  combinedRole: CombinedRoleType | null;
}

export function SalesManagerReport({
  user,
  combinedRole,
}: SalesManagerReportProps) {
  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Prepare date parameters for API
  const dateParams = {
    startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
    endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
  };

  // Fetch sales manager stats
  const { data: statsData, isLoading: isStatsLoading } =
    useSalesManagerStats(dateParams);
  const { data: managers, isLoading: isManagersLoading } = useUsersSummary();

  // Fetch projects for column headers
  const { useProjectsStructure } = useInventory();
  const { data: projectsData, isLoading: isProjectsLoading } =
    useProjectsStructure();

  // Extract all project names for columns
  const allProjects = (projectsData?.data?.map((p) => p.name) || []).sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  // Handle download action
  const handleDownload = async () => {
    if (statsData?.data && statsData.data.length > 0 && user) {
      // Log the download action
      await logReportAction(
        user._id,
        user.username || "",
        {
          action: "download",
          reportType: "Sales Report",
          description: `Downloaded Sales Report with ${statsData.data.length} records`,
        },
        combinedRole?.roles || [],
      );

      exportSalesManagerToExcel(
        statsData.data,
        allProjects,
        managers,
        dateRange,
      );
    } else {
      console.log("No sales manager data available");
    }
  };

  const isDataAvailable = statsData?.data && statsData.data.length > 0;
  const isLoading = isStatsLoading || isProjectsLoading;

  return (
    <Card className="w-72 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FileSpreadsheet className="text-gray-500" />
          <span className="text-sm text-gray-500 uppercase">XLSX</span>
        </div>
        <CardTitle className="mt-4">Sales Report</CardTitle>
        <CardDescription>
          Detailed sales performance by manager and project
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow">{/* Your content here */}</CardContent>
      <CardFooter className="mt-auto flex-col gap-3">
        <DatePickerWithRange
          value={dateRange}
          onDateChange={setDateRange}
          className="w-full"
          showIcons={false}
          label="Select Report Range"
        />

        <Button
          className="w-full"
          variant="default"
          onClick={handleDownload}
          disabled={
            !isDataAvailable || isLoading || !dateRange?.from || !dateRange?.to
          }
        >
          <Download className="h-4 w-4 mr-2" />
          {isLoading || isManagersLoading ? "Loading..." : "Download Report"}
        </Button>
      </CardFooter>
    </Card>
  );
}
