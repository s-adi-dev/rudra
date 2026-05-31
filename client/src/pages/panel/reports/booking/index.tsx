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
import { useClientBookings } from "@/store/client-booking/query";
import { useBookingStore } from "@/store/client-booking/store";
import { useUsersSummary } from "@/store/users";
import { logReportAction } from "@/utils/report-audit-logger";
import type { userType } from "@/store/users/types";
import type { CombinedRoleType } from "@/store/role/types";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { BookingFilter } from "../../booking/booking-filter";
import { exportBookingToExcel } from "./excel";

interface BookingReportProps {
  user: userType | null;
  combinedRole: CombinedRoleType | null;
}

export function BookingReport({ user, combinedRole }: BookingReportProps) {
  // Fetch data from stores
  const { filters, resetFilters } = useBookingStore();
  const { data, isFetching } = useClientBookings({
    ...filters,
    page: 1,
    limit: 100000,
    search: "",
  });
  const { data: managers } = useUsersSummary();

  const countAppliedFilters = (filterObj: typeof filters) => {
    // List of keys to exclude
    const excludedKeys = ["page", "search", "limit"];

    const count = Object.entries(filterObj)
      .filter(([key]) => !excludedKeys.includes(key)) // Remove unwanted fields
      .reduce((total, [, value]) => {
        // Handle budget logic
        return value ? total + 1 : total;
      }, 0);

    return count;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => resetFilters(), []);

  // Handle export action
  const handleDownload = async () => {
    if (data?.data && data.data.length > 0 && managers && user) {
      // Log the download action
      await logReportAction(
        user._id,
        user.username || "",
        {
          action: "download",
          reportType: "Booking Report",
          description: `Downloaded Booking Report with ${data.data.length} records`,
        },
        combinedRole?.roles || [],
      );

      exportBookingToExcel(data.data, managers);
    } else {
      console.log("No client data available");
    }
  };

  // Check if download should be disabled
  const isDownloadDisabled =
    !data?.data || data.data.length === 0 || isFetching;

  return (
    <Card className="w-72 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FileSpreadsheet className="text-gray-500" />
          <span className="text-sm text-gray-500 uppercase">XLSX</span>
        </div>
        <CardTitle className="mt-4">Booking Report</CardTitle>
        <CardDescription>
          Detailed booking list in a spreadsheet
        </CardDescription>
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
        <BookingFilter>
          <Tooltip content="More filter options">
            <Button
              className="w-full flex-shrink-0 relative"
              variant="outline"
              disabled={!data?.data || data.data.length === 0}
            >
              {countAppliedFilters(filters) > 0 && (
                <Badge className="bg-red-500 text-white absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                  {countAppliedFilters(filters)}
                </Badge>
              )}
              Apply Filter
            </Button>
          </Tooltip>
        </BookingFilter>
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
