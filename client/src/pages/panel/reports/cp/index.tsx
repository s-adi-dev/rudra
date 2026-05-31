import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClientPartners } from "@/store/client-partner";
import { useUsersSummary } from "@/store/users";
import { logReportAction } from "@/utils/report-audit-logger";
import type { userType } from "@/store/users/types";
import type { CombinedRoleType } from "@/store/role/types";
import { Download, FileSpreadsheet } from "lucide-react";
import { exportCpToExcel } from "./excel";

interface ClientPartnerReportProps {
  user: userType | null;
  combinedRole: CombinedRoleType | null;
}

export function ClientPartnerReport({
  user,
  combinedRole,
}: ClientPartnerReportProps) {
  // Fetch data from stores
  const { useClientPartnersList } = useClientPartners();
  const { data: managers, isLoading: isManagerLoading } = useUsersSummary();
  const { data, isLoading } = useClientPartnersList({
    page: 1,
    limit: 10000,
    search: "", // This uses the debounced value from store
  });

  // Handle export action
  const handleDownload = async () => {
    if (data && data?.clientPartners.length > 0 && user) {
      // Log the download action
      await logReportAction(
        user._id,
        user.username || "",
        {
          action: "download",
          reportType: "CP Report",
          description: `Downloaded CP Report with ${data.clientPartners.length} records`,
        },
        combinedRole?.roles || [],
      );

      exportCpToExcel(data?.clientPartners, managers);
    } else {
      console.log("No client partner data available for export");
    }
  };

  return (
    <Card className="w-72 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FileSpreadsheet className="text-gray-500" />
          <span className="text-sm text-gray-500 uppercase">XLSX</span>
        </div>
        <CardTitle className="mt-4">CP Report</CardTitle>
        <CardDescription>
          Detailed channel partner list in a spreadsheet
        </CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto flex-col gap-2">
        <Button
          className="w-full mt-2"
          variant="default"
          onClick={handleDownload}
          disabled={
            isLoading || isManagerLoading || data?.clientPartners.length === 0
          }
        >
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </CardFooter>
    </Card>
  );
}
