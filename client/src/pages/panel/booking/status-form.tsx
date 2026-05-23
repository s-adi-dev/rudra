import { DatePickerV2 } from "@/components/custom ui/date-time-pickers";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useUpdateClientBooking } from "@/store/client-booking/query";
import {
  bookingClientStatus,
  ClientBooking,
} from "@/store/client-booking/types";
import { useInventory } from "@/store/inventory";
import { capitalizeWords } from "@/utils/func/strUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { useState } from "react";

interface BookingStatusFormProps {
  booking: ClientBooking;
  isOpen: boolean;
  onOpenChange: (state: boolean) => void;
}

export const BookingStatusForm = ({
  booking,
  isOpen,
  onOpenChange,
}: BookingStatusFormProps) => {
  const [bookingStatus, setBookingStatus] = useState<bookingClientStatus>(
    booking.status,
  );
  const [registrationDate, setRegistrationDate] = useState<Date | undefined>(
    booking.registrationDate ? new Date(booking.registrationDate) : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateBookingMutation = useUpdateClientBooking();
  const { updateUnitStatusMutation } = useInventory();

  const statuses: bookingClientStatus[] = [
    "booked",
    "cnc",
    "canceled",
    "registered",
    "loan-process",
    "registeration-process",
  ];

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const updateData: { status: bookingClientStatus; registrationDate?: Date } = {
        status: bookingStatus,
      };

      // Include registrationDate if status is registered
      if (bookingStatus === "registered") {
        if (!registrationDate) {
          toast({
            title: "Registration Date Required",
            description: "Please select a registration date for registered status.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        updateData.registrationDate = registrationDate;
      }

      await updateBookingMutation.mutateAsync({
        id: booking._id,
        updateData,
      });

      if (bookingStatus == "registered") {
        await updateUnitStatusMutation.mutateAsync({
          unitId: booking.unit._id,
          status: "registered",
        });
      }

      toast({
        title: "Status Updated",
        description: "The booking status has been successfully updated.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update booking status:", error);
      const err = error as CustomAxiosError;
      toast({
        title: "Update Failed",
        description:
          err.response?.data.error ||
          "An unknown error occurred while updating the booking status.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold">
            Update Booking Status
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {booking.applicant}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <FormFieldWrapper
            Important
            ImportantSide="right"
            LabelText="Booking Status"
            className="gap-3"
          >
            <Select
              value={bookingStatus}
              onValueChange={(e) => setBookingStatus(e as bookingClientStatus)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {capitalizeWords(status.replace("-", " "))}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormFieldWrapper>

          {bookingStatus === "registered" && (
            <FormFieldWrapper
              Important
              ImportantSide="right"
              LabelText="Registration Date"
              className="gap-3"
            >
              <DatePickerV2
                defaultDate={registrationDate}
                onDateChange={setRegistrationDate}
                disabled={isSubmitting}
                className="sm:w-full"
                closeOnDayClick={true}
              />
            </FormFieldWrapper>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSubmitting ||
              bookingStatus == booking.status ||
              (bookingStatus === "registered" && !registrationDate)
            }
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
