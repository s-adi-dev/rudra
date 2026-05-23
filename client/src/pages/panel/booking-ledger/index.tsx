import { CenterWrapper } from "@/components/custom ui/center-page";
import ErrorCard from "@/components/custom ui/error-display";
import { Loader } from "@/components/custom ui/loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { hasPermission } from "@/hooks/use-role";
import { toast } from "@/hooks/use-toast";
import {
  DemandLetterDataType,
  DemandLetterPdf,
} from "@/pdf-templates/demand-letter";
import { useAuth } from "@/store/auth";
import { useBankAccounts } from "@/store/bank";
import { ClientBookingReference } from "@/store/booking-ledger";
import { useBookingLedger } from "@/store/booking-ledger/query";
import { useBookingLedgerStore } from "@/store/booking-ledger/store";
import { useClientBookingById } from "@/store/client-booking/query";
import { useInventory } from "@/store/inventory";
import { CustomAxiosError } from "@/utils/types/axios";
import { pdf } from "@react-pdf/renderer";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookingLedgerFooter } from "./ledger-footer";
import { CreatePaymentForm } from "./ledger-form";
import { BookingLedgerHeader } from "./ledger-header";
import { BookingLedgerTable } from "./ledger-table";

function calculateMonthlyInterestAmount(amountPayable: number, months: number) {
  // amountPayable = (agreementValue * projectStage) / 100 - amountReceived
  return ((amountPayable * 24) / 100 / 12) * months;
}

function calculateDailyInterestAmount(amountPayable: number, days: number) {
  // amountPayable = (agreementValue * projectStage) / 100 - amountReceived
  // Interest at 24% per annum, calculated per day
  return ((amountPayable * 24) / 100 / 365) * days;
}

const BookingLedgerList = () => {
  // Hooks
  const [isFiltered, setIsFiltered] = useState<boolean>(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { setBreadcrumbs } = useBreadcrumb();
  const { pageno, ledgerPageNo } = useParams();
  const PageNo = Number(pageno) ? Number(pageno) : 1;
  const LedgerPageNo = Number(ledgerPageNo) ? Number(ledgerPageNo) : 1;
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: bankRef,
    isLoading: isBankLoading,
    error: bankError,
  } = useBankAccounts();
  const { filters, setFilters, resetFilters, setSelectedClientId } =
    useBookingLedgerStore();
  const { usePaymentsByClient } = useBookingLedger();
  const { logout: handleLogout, combinedRole } = useAuth(true);

  const canViewDeletedPayments = hasPermission(
    combinedRole,
    "BookingLedger",
    "view-deleted-booking-payments",
  );

  // Get payments data
  const { data, isLoading, error } = usePaymentsByClient(
    clientId || "",
    filters,
  );
  const {
    data: clientBooking,
    isLoading: isClientBookingLoading,
    error: clientBookingError,
  } = useClientBookingById(clientId || "");
  const { useProjectByName } = useInventory();
  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
  } = useProjectByName(clientBooking?.data.project || "");

  const clientRef: ClientBookingReference = {
    _id: clientBooking?.data._id || "",
    applicant: clientBooking?.data.applicant || "",
    phoneNo: clientBooking?.data.phoneNo || "",
    email: clientBooking?.data.email || "",
    project: clientBooking?.data.project || "",
    unit: clientBooking?.data.unit.unitNumber || "",
    wing: clientBooking?.data.wing || "",
  };

  // Event Handlers
  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
    navigate(`/panel/booking/${PageNo}/ledger/${clientId}/${newPage}`);
  };

  const handleClearFilter = () => {
    resetFilters();
    setIsFiltered(false);
  };

  const handleGenerateLetter = async (
    isSigned: boolean = false,
    includeLetterHead: boolean = false,
    interestData?:
      | { type: "amount"; value: number }
      | { type: "months"; value: number }
      | { type: "days"; value: number },
  ) => {
    if (!project || !clientBooking || !data) {
      return toast({
        title: "Error Occurred",
        description: `Missing required data for generating demand letter`,
        variant: "destructive",
      });
    }

    try {
      const cb = clientBooking.data;
      const p = project.data;

      if (!p.bank) {
        return toast({
          title: "Error Occurred",
          description: `Missing project bank data for generating demand letter`,
          variant: "destructive",
        });
      }

      // Calculate amount received
      const amountReceived =
        data.summary.totalPayments - data.summary.totalRefunds;

      // Calculate interest amount if needed
      let finalInterestAmount = 0;
      if (interestData) {
        if (interestData.type === "amount") {
          // Use the manually entered amount
          finalInterestAmount = interestData.value;
        } else if (interestData.type === "months") {
          // Calculate interest based on months
          const agreementValue = cb.agreementValue;
          const projectStage = p.projectStage;
          const amountPayable =
            (agreementValue * projectStage) / 100 - amountReceived;

          if (amountPayable > 0) {
            finalInterestAmount = calculateMonthlyInterestAmount(
              amountPayable,
              interestData.value,
            );
          } else {
            finalInterestAmount = 0;
          }
        } else if (interestData.type === "days") {
          // Calculate interest based on days
          const agreementValue = cb.agreementValue;
          const projectStage = p.projectStage;
          const amountPayable =
            (agreementValue * projectStage) / 100 - amountReceived;

          if (amountPayable > 0) {
            finalInterestAmount = calculateDailyInterestAmount(
              amountPayable,
              interestData.value,
            );
          } else {
            finalInterestAmount = 0;
          }
        }
      }

      const demandLetterData: DemandLetterDataType = {
        applicationInfo: {
          date: new Date(),
          applicant: cb.applicant,
          coApplicant: cb.coApplicant,
        },
        property: {
          project: {
            name: p.name,
            legalName: p.legalName,
            address: p.location,
          },
          unitDetails: {
            unitNo: cb.unit.unitNumber,
            wing: cb.wing,
            floorNo: Number(cb.floor),
          },
        },
        financials: {
          projectStage: p.projectStage,
          agreementValue: cb.agreementValue.toString(),
          amountReceived: amountReceived,
        },
        banking: {
          holderName: p.bank.holderName,
          bank: p.bank.name,
          accountNo: p.bank.accountNumber,
          ifscCode: p.bank.ifscCode,
          branch: p.bank.branch,
        },
      };

      // Generate PDF blob
      const blob = await pdf(
        <DemandLetterPdf
          data={demandLetterData}
          letterHeadData={{
            name: project.data.by,
            address: project.data.location,
            email: project.data.email || "",
          }}
          isSigned={isSigned}
          includeLetterHead={includeLetterHead}
          interestAmount={finalInterestAmount}
        />,
      ).toBlob();

      // Create object URL for the blob
      const url = URL.createObjectURL(blob);

      // Open PDF in new tab
      const newWindow = window.open(url, "_blank");

      if (!newWindow) {
        toast({
          title: "Pop-up Blocked",
          description: "Please allow pop-ups for this site to preview the PDF",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${interestData ? "Interest" : "Demand"} letter generated successfully`,
          variant: "default",
        });
      }

      // Clean up the object URL after a delay to prevent memory leaks
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error("Error generating demand letter:", error);
      toast({
        title: "Error Occurred",
        description: "Failed to generate demand letter. Please try again.",
        variant: "destructive",
      });
    }
  };
  // Effects
  useEffect(() => {
    if (clientId) {
      setSelectedClientId(clientId);
    }
  }, [clientId, setSelectedClientId]);

  useEffect(() => {
    setFilters({ includeDeleted: canViewDeletedPayments });
  }, [canViewDeletedPayments, setFilters]);

  useEffect(() => {
    handlePageChange(LedgerPageNo);
    if (LedgerPageNo) {
      setFilters({ page: LedgerPageNo });
    } else resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [LedgerPageNo]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Booking List", to: `/panel/booking/${PageNo}` },
      { label: "Booking Ledger" },
    ]);
  }, [setBreadcrumbs, PageNo]);

  // Handle other cases
  if (
    isLoading ||
    isClientBookingLoading ||
    isProjectLoading ||
    isBankLoading
  ) {
    return (
      <CenterWrapper>
        <Loader />
      </CenterWrapper>
    );
  }

  if (error || clientBookingError || projectError || bankError) {
    const axiosError = (error ||
      clientBookingError ||
      projectError ||
      bankError) as CustomAxiosError;
    const { response, message } = axiosError || {};

    let errMsg =
      response?.data?.error ?? message ?? "An unknown error occurred";

    if (errMsg === "Access denied. No token provided") {
      errMsg = "Access denied. No token provided, please login again.";
    } else if (errMsg === "Network Error") {
      errMsg =
        "Connection issue detected. Please check your internet or try again later.";
    }

    return (
      <CenterWrapper className="px-2 gap-2 text-center">
        <ErrorCard
          title="Error occurred"
          description={errMsg}
          btnTitle="Go to Login"
          onAction={handleLogout}
        />
      </CenterWrapper>
    );
  }

  if (!clientId) {
    return (
      <CenterWrapper className="px-2 gap-2 text-center">
        <ErrorCard
          title="Client Not Found"
          description="No client ID provided in the URL"
          btnTitle="Go Back to Bookings"
          onAction={() => window.history.back()}
        />
      </CenterWrapper>
    );
  }

  return (
    <Card className="w-[90svw] lg:w-full">
      <CardHeader>
        <CardTitle>
          Booking Ledger – {clientBooking?.data.applicant || "Unknown Client"}
        </CardTitle>
        <CardDescription>
          Viewing payment history for{" "}
          {clientBooking?.data.project || "Unknown Project"}
          {clientBooking?.data.wing || clientBooking?.data.unit.unitNumber
            ? ` – ${clientBooking?.data.wing || ""}${
                clientBooking?.data.unit.unitNumber
                  ? "-" + clientBooking?.data.unit.unitNumber
                  : ""
              }`
            : ""}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Section */}
        {data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-md sm:text-lg font-semibold  font-mono">
                ₹{data.summary.totalAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-md sm:text-lg font-semibold text-green-600  font-mono">
                ₹{data.summary.totalPayments.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Refunds</p>
              <p className="text-md sm:text-lg font-semibold text-red-600  font-mono">
                ₹{data.summary.totalRefunds.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Penalties</p>
              <p className="text-md sm:text-lg font-semibold text-orange-600  font-mono">
                ₹{data.summary.totalPenalties.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        {/* TODO: Add BookingLedgerHeader component here */}
        <BookingLedgerHeader
          data={data}
          handlePageChange={handlePageChange}
          handleGenerateLetter={handleGenerateLetter}
          isFiltered={isFiltered}
          clearFilter={handleClearFilter}
          handleAddPayment={() => setShowPaymentForm(true)}
        />

        <BookingLedgerTable data={data} />

        {/* TODO: Add BookingLedgerFooter component here */}
        <BookingLedgerFooter data={data} />
      </CardContent>
      <CreatePaymentForm
        clientBooking={clientRef}
        bankAccounts={bankRef?.data || []}
        isOpen={showPaymentForm}
        onOpenChange={setShowPaymentForm}
      />
    </Card>
  );
};

export default BookingLedgerList;
