import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { hasPermission } from "@/hooks/use-role";
import { useAuth } from "@/store/auth";
import { useEffect } from "react";
import { BookingReport } from "./booking";
import { ClientReport } from "./client";
import { ClientPartnerReport } from "./cp";
import { InventorySummaryExcelReport } from "./excel-summary";
import { InventoryReport } from "./inventory";
import { InventorySummaryReport } from "./inventory-summary";
import { SalesManagerReport } from "./target";
import { UserReport } from "./user";

const Reports = () => {
  // Hooks
  const { setBreadcrumbs } = useBreadcrumb();
  const { combinedRole } = useAuth(true);

  // Helper functions
  const showReport = (perm: string) => {
    return hasPermission(combinedRole, "Reports", perm);
  };

  // useEffects
  useEffect(() => {
    setBreadcrumbs([
      {
        label: "Reports",
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <div className="w-full grid place-items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {showReport("inventory-report") && <InventoryReport />}
      {showReport("inventory-summary-report") && <InventorySummaryReport />}
      {showReport("inventory-summary-report") && (
        <InventorySummaryExcelReport />
      )}
      {showReport("booking-report") && <BookingReport />}
      {showReport("user-report") && <UserReport />}
      {showReport("client-report") && <ClientReport />}
      {showReport("cp-report") && <ClientPartnerReport />}
      {showReport("sales-range-report") && <SalesManagerReport />}
    </div>
  );
};

export default Reports;
