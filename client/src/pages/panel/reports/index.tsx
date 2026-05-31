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
import { RegisteredClientsReport } from "./registered-clients.ts";

const Reports = () => {
  // Hooks
  const { setBreadcrumbs } = useBreadcrumb();
  const { combinedRole, user } = useAuth(true);

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
      {showReport("inventory-report") && (
        <InventoryReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("inventory-summary-report") && (
        <InventorySummaryReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("inventory-summary-report") && (
        <InventorySummaryExcelReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("booking-report") && (
        <BookingReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("user-report") && (
        <UserReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("client-report") && (
        <ClientReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("cp-report") && (
        <ClientPartnerReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("sales-range-report") && (
        <SalesManagerReport user={user} combinedRole={combinedRole} />
      )}
      {showReport("registered-clients-payment-report") && (
        <RegisteredClientsReport user={user} combinedRole={combinedRole} />
      )}
    </div>
  );
};

export default Reports;
