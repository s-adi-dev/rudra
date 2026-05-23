import { useAlertDialog } from "@/components/custom ui/alertDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission } from "@/hooks/use-role";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/store/auth";
import { useDeleteClientBooking } from "@/store/client-booking/query";
import {
  ClientBooking,
  ClientBookingPaginatedResponse,
} from "@/store/client-booking/types";
import { usersSummaryType, useUsersSummary } from "@/store/users";
import withStopPropagation from "@/utils/events/withStopPropagation";
import { simplifyNumber } from "@/utils/func/numberUtils";
import { capitalizeWords } from "@/utils/func/strUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { MoreHorizontal } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingUpdateForm } from "./booking-form";
import { BookingStatusForm } from "./status-form";

interface BookingTableProps {
  data: ClientBookingPaginatedResponse | undefined;
}

const getStatusClr = (status: string) => {
  switch (status) {
    case "canceled":
      return "destructive";
    case "loan-process":
      return "info";
    case "booked":
      return "warning";
    case "registeration-process":
      return "urgent";
    case "registered":
      return "success";
    default:
      return "default";
  }
};

const getManagerName = (
  username: string,
  managers: usersSummaryType[] | undefined,
) => {
  if (!managers || !username) return username;
  const manager = managers.find((m) => m.username === username);
  return manager ? manager.firstName : username;
};

// Helper function for payment type abbreviation
function getPaymentTypeAbbreviation(paymentType: string): string {
  // Split into words (handling both hyphen and space separators)
  const words = paymentType.replace(/-/g, " ").split(" ");
  // Take the first letter of each word, capitalize, and join
  return words
    .filter((word) => word.length > 0) // Ignore empty strings (if any)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export const BookingTable = ({ data }: BookingTableProps) => {
  const { data: managers } = useUsersSummary();
  const deleteBookingMutation = useDeleteClientBooking();
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<
    ClientBooking | undefined
  >();
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dialog = useAlertDialog({
    iconName: "Trash2",
    title: "Delete Booking",
    description: "Are you sure? you want to delete this booking?",
    cancelLabel: "Cancel",
    actionLabel: "Delete Booking",
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      // ...prev, //uncomment this line for expanding multiple rows
      [id]: !prev[id],
    }));
  };

  // Events Handlers
  const handleDelete = async (booking: ClientBooking) => {
    dialog.show({
      config: {
        alertType: "Danger",
        description: `Are you sure you want to delete this booking for ${booking.applicant}?`,
      },
      onAction: async () => {
        try {
          await deleteBookingMutation.mutateAsync(booking._id);
          toast({
            title: "Booking Deleted",
            description: "The client booking was deleted successfully.",
          });
          navigate(`/panel/booking/1`);
        } catch (error) {
          const err = error as CustomAxiosError;
          console.log(err);
          toast({
            title: "Error Occurred",
            description:
              err.response?.data.error || "An unknown error occurred.",
            variant: "destructive",
          });
        }
      },
    });
  };

  const handleUpdateModal = (booking: ClientBooking) => {
    setSelectedBooking(booking);
    setIsUpdateOpen(true);
  };

  const handleStatusModal = (booking: ClientBooking) => {
    setSelectedBooking(booking);
    setIsStatusOpen(true);
  };

  // useEffects
  useEffect(() => {
    // Measure the heights of all expanded content
    const newHeights: Record<string, number> = {};
    Object.keys(contentRefs.current).forEach((id) => {
      const element = contentRefs.current[id];
      if (element) {
        newHeights[id] = element.scrollHeight;
      }
    });
    setHeights(newHeights);
  }, [data?.data]);

  return (
    <div className="rounded-md border w-full">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-card">
            <TableHead className="text-center">Date</TableHead>
            <TableHead className="text-center">Applicant</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center whitespace-nowrap">
              Reg. Date
            </TableHead>
            <TableHead className="text-center">Project</TableHead>
            <TableHead className="text-center">Wing</TableHead>
            <TableHead className="text-center">Unit</TableHead>
            <TableHead className="text-center">Config</TableHead>
            <TableHead className="text-center">Plan</TableHead>
            <TableHead className="text-center">Amount</TableHead>
            <TableHead className="text-center">Manager</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!data?.data?.length ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center">
                No Booking Data
              </TableCell>
            </TableRow>
          ) : (
            data.data.map((booking) => {
              const bookingId = booking._id.toString();
              const isOpen = openItems[bookingId] || false;

              return (
                <React.Fragment key={bookingId}>
                  <TableRow
                    className={`transition-colors duration-200 cursor-pointer ${isOpen ? "bg-muted/30" : ""}`}
                    onClick={() => toggleItem(bookingId)}
                  >
                    <TableCell className="text-center">
                      {new Date(booking.date)
                        .toLocaleString("en-GB", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                        .replace(",", "")}
                    </TableCell>
                    <TableCell className="text-center">
                      {capitalizeWords(booking.applicant)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={getStatusClr(booking.status)}
                        className="whitespace-nowrap"
                      >
                        {booking.status == "registeration-process"
                          ? "REG. PROCESS"
                          : booking.status.replace("-", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {booking.registrationDate
                        ? new Date(booking.registrationDate).toLocaleString(
                            "en-GB",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            },
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {booking.project}
                    </TableCell>
                    <TableCell className="text-center">
                      {booking.wing}
                    </TableCell>
                    <TableCell className="text-center">
                      {booking.unit.unitNumber}
                    </TableCell>
                    <TableCell className="text-center">
                      {booking.unit.configuration.toUpperCase()}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPaymentTypeAbbreviation(booking.paymentType)}
                    </TableCell>
                    <TableCell className="text-center">
                      ₹{booking.bookingAmt.toLocaleString("en-GB")}
                    </TableCell>
                    <TableCell className="text-center">
                      {getManagerName(booking.salesManager, managers)}
                    </TableCell>
                    <TableCell className="text-center">
                      <MoreAction
                        booking={booking}
                        handleDelete={handleDelete}
                        handleUpdateModal={handleUpdateModal}
                        handleStatusModal={handleStatusModal}
                      />
                    </TableCell>
                  </TableRow>

                  <TableRow className="expandable-row">
                    <TableCell colSpan={12} className="p-0 border-b border-t-0">
                      <div
                        style={{
                          height: isOpen
                            ? `${heights[bookingId] || 0}px`
                            : "0px",
                          opacity: isOpen ? 1 : 0,
                          overflow: "hidden",
                          transition: "height 0.3s ease, opacity 0.3s ease",
                        }}
                      >
                        <div
                          ref={(e) => (contentRefs.current[bookingId] = e)}
                          className="p-4 bg-muted/50"
                        >
                          <DetailsRow booking={booking} />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
      {selectedBooking && (
        <BookingUpdateForm
          isOpen={isUpdateOpen}
          onOpenChange={setIsUpdateOpen}
          booking={selectedBooking}
        />
      )}

      {selectedBooking && (
        <BookingStatusForm
          isOpen={isStatusOpen}
          onOpenChange={setIsStatusOpen}
          booking={selectedBooking}
        />
      )}

      <dialog.AlertDialog />
    </div>
  );
};

const DetailsRow = ({ booking }: { booking: ClientBooking }) => {
  return (
    <div className="rounded-md bg-muted/70 p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-4">
        <span className="flex items-center gap-3">
          <h4 className="text-sm font-bold">Co Applicant:</h4>
          <p className="text-sm">{booking.coApplicant || "N/A"}</p>
        </span>
        <span className="flex items-center gap-3">
          <h4 className="text-sm font-bold">Aadhaar No:</h4>
          <p className="text-sm">{booking.aadhaarNo || "N/A"}</p>
        </span>
        <span className="flex items-center gap-3">
          <h4 className="text-sm font-bold">PAN No:</h4>
          <p className="text-sm">{booking.panNo || "N/A"}</p>
        </span>

        <span className="flex items-center gap-3 col-span-3">
          <h4 className="text-sm font-bold">Client Partner:</h4>
          <p className="text-sm">{booking.clientPartner || "N/A"}</p>
        </span>

        <span className="flex items-center gap-3">
          <h4 className="text-sm font-bold">Phone Number:</h4>
          <p className="text-sm">{booking.phoneNo}</p>
        </span>
        <span className="flex items-center gap-3">
          <h4 className="text-sm font-bold">Alt No:</h4>
          <p className="text-sm">{booking.altNo || "N/A"}</p>
        </span>

        <span className="flex items-center gap-3">
          <h4 className="text-sm font-bold">Email Address:</h4>
          <p className="text-sm">{booking.email || "N/A"}</p>
        </span>
        <span className="flex items-center gap-3">
          <h4 className="text-sm font-bold">Agreement Value:</h4>
          <p className="text-sm">
            {simplifyNumber(booking.agreementValue) || "N/A"}
          </p>
        </span>
        <span className="flex items-center gap-3 col-span-3">
          <h4 className="text-sm font-bold">Deal Terms:</h4>
          <p className="text-sm">{booking.dealTerms}</p>
        </span>

        <span className="flex items-center gap-3 col-span-3">
          <h4 className="text-sm font-bold">Payment Terms:</h4>
          <p className="text-sm">{booking.paymentTerms}</p>
        </span>

        <span className="flex items-center gap-3 col-span-3">
          <h4 className="text-sm font-bold">Address:</h4>
          <p className="text-sm">{booking.address}</p>
        </span>
      </div>
    </div>
  );
};

const MoreAction = ({
  booking,
  handleDelete,
  handleUpdateModal,
  handleStatusModal,
}: {
  booking: ClientBooking;
  handleDelete: (booking: ClientBooking) => void;
  handleUpdateModal: (booking: ClientBooking) => void;
  handleStatusModal: (booking: ClientBooking) => void;
}) => {
  const navigate = useNavigate();
  const { combinedRole } = useAuth(true);

  const Permissions = {
    updateBooking: hasPermission(combinedRole, "Booking", "update-booking"),
    deleteBooking: hasPermission(combinedRole, "Booking", "delete-booking"),
    changeStatus: hasPermission(
      combinedRole,
      "Booking",
      "update-booking-status",
    ),
    ledgerPerms:
      hasPermission(combinedRole, "BookingLedger", "view-booking-ledger") &&
      booking.status == "registered",
  };

  const hasPerms =
    Permissions.updateBooking ||
    Permissions.deleteBooking ||
    Permissions.changeStatus;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="miniIcon" disabled={!hasPerms}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      {hasPerms && (
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions Menu</DropdownMenuLabel>
          {Permissions.ledgerPerms && (
            <DropdownMenuItem
              onClick={withStopPropagation(() =>
                navigate(`ledger/${booking._id}`),
              )}
            >
              Open Ledger
            </DropdownMenuItem>
          )}
          {Permissions.changeStatus && (
            <DropdownMenuItem
              onClick={withStopPropagation(() => handleStatusModal(booking))}
            >
              Change Status
            </DropdownMenuItem>
          )}
          {Permissions.updateBooking && (
            <DropdownMenuItem
              onClick={withStopPropagation(() => handleUpdateModal(booking))}
            >
              Update Booking
            </DropdownMenuItem>
          )}
          {Permissions.deleteBooking && (
            <DropdownMenuItem
              onClick={withStopPropagation(() => handleDelete(booking))}
            >
              Delete Booking
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};
